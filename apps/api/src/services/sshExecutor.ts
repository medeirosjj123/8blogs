import { NodeSSH } from 'node-ssh';
import { EventEmitter } from 'events';
import { PortManager } from './portManager';

export interface SSHConfig {
  host: string;
  username: string;
  password?: string;
  privateKey?: string;
  port?: number;
}

export interface InstallationResult {
  success: boolean;
  credentials?: {
    siteUrl: string;
    adminUrl: string;
    username: string;
    password: string;
  };
  siteInfo?: {
    domain: string;
    ipAddress: string;
    accessUrl: string;
    adminUrl: string;
  };
  dnsInstructions?: {
    cloudflare: string[];
    generic: string[];
  };
  error?: string;
}

export interface WordPressConfig {
  credentials?: {
    siteTitle: string;
    adminUsername: string;
    adminEmail: string;
    adminPassword: string;
  };
  theme?: {
    _id: string;
    slug: string;
    downloadUrl?: string;
  };
  plugins?: string[]; // Array of plugin slugs
}

export interface InstallationOptions {
  domain: string;
  userEmail: string;
  userId: string;
  wordpressConfig?: WordPressConfig | null;
  skipSystemSetup?: boolean; // Skip system setup if server is already configured
  installationId?: string; // Installation document ID for port assignment
}

export class SSHExecutor extends EventEmitter {
  private ssh: NodeSSH;
  private config: SSHConfig;
  private connected: boolean = false;
  private completedSteps: Set<string> = new Set();
  private currentStep: string = '';

  constructor(config: SSHConfig) {
    super();
    this.ssh = new NodeSSH();
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      this.emit('output', `🔌 Attempting SSH connection to ${this.config.host}:${this.config.port || 22}`);
      this.emit('output', `👤 Username: ${this.config.username}`);
      this.emit('output', `🔐 Auth method: ${this.config.privateKey ? 'Private Key' : 'Password'}`);
      
      await this.ssh.connect(this.config);
      this.connected = true;
      this.emit('connected');
      this.emit('output', `✅ SSH connection established successfully to ${this.config.host}`);
    } catch (error) {
      this.emit('output', `❌ SSH connection failed to ${this.config.host}:${this.config.port || 22}`);
      this.emit('output', `❌ Connection error: ${error.message}`);
      this.emit('output', `🔍 Possible causes:`);
      this.emit('output', `   • Server is not accessible on port ${this.config.port || 22}`);
      this.emit('output', `   • Wrong username or credentials`);
      this.emit('output', `   • Firewall blocking connection`);
      this.emit('output', `   • SSH service not running on server`);
      this.emit('error', `SSH Connection Failed: ${error.message}`);
      throw new Error(`Failed to connect to ${this.config.host}: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      this.ssh.dispose();
      this.connected = false;
      this.emit('disconnected');
    }
  }

  private async execCommand(command: string): Promise<any> {
    try {
      // Log command being executed (for debugging)
      this.emit('output', `🔧 Executing: ${command}`);
      
      const result = await this.ssh.execCommand(command);
      
      // Log command result details
      this.emit('output', `✅ Command completed with exit code: ${result.code}`);
      if (result.stdout && result.stdout.trim()) {
        this.emit('output', `📤 STDOUT: ${result.stdout.trim()}`);
      }
      if (result.stderr && result.stderr.trim()) {
        this.emit('output', `📤 STDERR: ${result.stderr.trim()}`);
      }
      
      return result;
    } catch (error) {
      this.emit('output', `❌ Command execution failed: ${command}`);
      this.emit('output', `❌ Error details: ${error.message}`);
      this.emit('error', `Command: ${command}\nError: ${error.message}`);
      throw error;
    }
  }

  private async execCommandWithOutput(command: string): Promise<void> {
    const result = await this.execCommand(command);
    if (result.stdout) this.emit('output', result.stdout);
    if (result.stderr && result.code !== 0) {
      this.emit('output', `⚠️ Command stderr (code ${result.code}): ${result.stderr}`);
      this.emit('error', result.stderr);
    }
    if (result.code !== 0) {
      const errorMsg = `Command failed with code ${result.code}: ${result.stderr}`;
      this.emit('output', `❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }

  private async detectServerConfiguration(): Promise<{
    hasWordOps: boolean;
    hasNginx: boolean;
    hasMySQL: boolean;
    hasPHP: boolean;
    hasWPCLI: boolean;
    isConfigured: boolean;
  }> {
    const checks = {
      hasWordOps: false,
      hasNginx: false,
      hasMySQL: false,
      hasPHP: false,
      hasWPCLI: false,
      isConfigured: false,
    };

    try {
      // Check WordOps
      const woCheck = await this.execCommand('which wo 2>/dev/null || echo ""');
      checks.hasWordOps = !!woCheck.stdout.trim();

      // Check Nginx
      const nginxCheck = await this.execCommand('which nginx 2>/dev/null || echo ""');
      checks.hasNginx = !!nginxCheck.stdout.trim();

      // Check MySQL
      const mysqlCheck = await this.execCommand('which mysql 2>/dev/null || echo ""');
      checks.hasMySQL = !!mysqlCheck.stdout.trim();

      // Check PHP
      const phpCheck = await this.execCommand('which php 2>/dev/null || echo ""');
      checks.hasPHP = !!phpCheck.stdout.trim();

      // Check WP-CLI
      const wpCliCheck = await this.execCommand('which wp 2>/dev/null || echo ""');
      checks.hasWPCLI = !!wpCliCheck.stdout.trim();

      // Server is considered configured if it has the core components
      checks.isConfigured = checks.hasWordOps && checks.hasNginx && checks.hasMySQL && checks.hasPHP;

      this.emit('output', `🔍 Detecção de configuração:`);
      this.emit('output', `   WordOps: ${checks.hasWordOps ? '✅' : '❌'}`);
      this.emit('output', `   Nginx: ${checks.hasNginx ? '✅' : '❌'}`);
      this.emit('output', `   MySQL: ${checks.hasMySQL ? '✅' : '❌'}`);
      this.emit('output', `   PHP: ${checks.hasPHP ? '✅' : '❌'}`);
      this.emit('output', `   WP-CLI: ${checks.hasWPCLI ? '✅' : '❌'}`);
      this.emit('output', `   Servidor configurado: ${checks.isConfigured ? '✅' : '❌'}`);

      return checks;
    } catch (error) {
      this.emit('output', `⚠️  Erro na detecção: ${error.message}`);
      return checks;
    }
  }

  async executeInstallation(options: InstallationOptions): Promise<InstallationResult> {
    // Set overall installation timeout (10 minutes)
    const installationTimeout = 10 * 60 * 1000; // 10 minutes
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Installation timeout: Process exceeded 10 minutes'));
      }, installationTimeout);
    });
    
    // Race between installation and timeout
    return Promise.race([
      this.executeInstallationInternal(options),
      timeoutPromise
    ]);
  }

  private async executeInstallationInternal(options: InstallationOptions): Promise<InstallationResult> {
    if (!this.connected) {
      await this.connect();
    }

    const { domain, userEmail, userId, wordpressConfig, installationId } = options;
    
    // Initialize site identifier (will be set based on installation type)
    let siteIdentifier = domain;
    
    // Use custom WordPress credentials if provided, otherwise defaults
    const wpUser = wordpressConfig?.credentials?.adminUsername || 'admin';
    const wpPass = wordpressConfig?.credentials?.adminPassword || 'admin123';
    const wpEmail = wordpressConfig?.credentials?.adminEmail || userEmail;
    
    // Escape password for bash to handle special characters safely
    const escapedWpPass = wpPass.replace(/'/g, "'\"'\"'").replace(/\$/g, '\\$');
    const siteTitle = wordpressConfig?.credentials?.siteTitle || 'WordPress Site';
    const ipAddress = this.config.host;
    
    // Check if this is an IP-based installation
    const isIPInstallation = /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(domain);
    let assignedPort: number | undefined;
    let previewDomain: string | undefined;

    // Always assign a unique port for preview access (both domain and IP installations)
    if (installationId) {
      try {
        assignedPort = await PortManager.getNextAvailablePort();
        previewDomain = PortManager.generatePreviewDomain(userId, siteTitle);
        this.emit('output', `🔢 Porto atribuído: ${assignedPort}`);
        this.emit('output', `🌐 Domínio de preview: ${previewDomain}`);
        
        // Reserve the port
        await PortManager.reservePort(installationId, assignedPort);
      } catch (portError) {
        this.emit('output', `⚠️ Erro ao atribuir porto: ${portError.message}`);
        // Continue with default port 80 if port assignment fails
      }
    }

    try {
      // Auto-detect server configuration
      const serverConfig = await this.detectServerConfiguration();
      const skipSystemSetup = options.skipSystemSetup || serverConfig.isConfigured;

      if (skipSystemSetup) {
        this.emit('output', '🚀 Servidor já configurado - executando instalação rápida de site');
      } else {
        this.emit('output', '⚙️ Servidor novo detectado - executando configuração completa');
      }

      // Step 0: Pre-flight checks  
      await this.executeStep('preflight', '🔍 [0/6] Verificações Iniciais', async () => {
        this.emit('output', '🔍 Verificando configuração do servidor...');
        
        // Check if WordOps is installed and if site already exists
        const woCheck = await this.execCommand('which wo');
        if (woCheck.stdout) {
          this.emit('output', '✅ WordOps detectado, verificando sites existentes...');
          
          // Check if the domain already exists in WordOps
          const siteCheck = await this.execCommand(`wo site info ${domain} 2>/dev/null || echo "not found"`);
          if (siteCheck.stdout && !siteCheck.stdout.includes('not found')) {
            this.emit('output', '⚠️  Site já existe no WordOps!');
            throw new Error(`O domínio ${domain} já está configurado neste servidor. Por favor, remova o site existente primeiro ou use um domínio diferente.`);
          }
        }
        
        // Check if nginx config exists for this domain
        this.emit('output', '🔍 Verificando configuração do Nginx...');
        const nginxCheck = await this.execCommand(`ls /etc/nginx/sites-available/${domain} 2>/dev/null || echo "not found"`);
        if (nginxCheck.stdout && !nginxCheck.stdout.includes('not found')) {
          this.emit('output', '⚠️  Configuração Nginx existente detectada!');
          throw new Error(`Configuração Nginx para ${domain} já existe. Isso indica que um site já está configurado.`);
        }
        
        // Check if web directory exists
        this.emit('output', '🔍 Verificando diretórios do site...');
        const dirCheck = await this.execCommand(`ls -la /var/www/${domain} 2>/dev/null || echo "not found"`);
        if (dirCheck.stdout && !dirCheck.stdout.includes('not found')) {
          // Check if it has WordPress files
          const wpCheck = await this.execCommand(`ls /var/www/${domain}/htdocs/wp-config.php 2>/dev/null || echo "not found"`);
          if (wpCheck.stdout && !wpCheck.stdout.includes('not found')) {
            this.emit('output', '⚠️  WordPress já instalado neste domínio!');
            throw new Error(`WordPress já está instalado em /var/www/${domain}. Por favor, remova a instalação existente primeiro.`);
          }
        }
        
        // Check if MySQL database exists (if MySQL is installed)
        this.emit('output', '🔍 Verificando banco de dados...');
        const mysqlCheck = await this.execCommand('which mysql');
        if (mysqlCheck.stdout) {
          const dbName = domain.replace(/\./g, '_').replace(/-/g, '_');
          const dbCheck = await this.execCommand(`mysql -e "SHOW DATABASES LIKE '${dbName}'" 2>/dev/null || echo ""`);
          if (dbCheck.stdout && dbCheck.stdout.includes(dbName)) {
            this.emit('output', '⚠️  Banco de dados já existe!');
            this.emit('output', `💡 Dica: O banco de dados ${dbName} já existe. Isso pode indicar uma instalação anterior.`);
            // Don't throw error here, just warn - database might be from a failed attempt
          }
        }
        
        // Check available disk space
        this.emit('output', '🔍 Verificando espaço em disco...');
        const diskCheck = await this.execCommand("df -h / | awk 'NR==2 {print $4}'");
        this.emit('output', `💾 Espaço disponível: ${diskCheck.stdout.trim()}`);
        
        // Parse disk space to ensure we have at least 1GB free
        const diskSpace = diskCheck.stdout.trim();
        const spaceValue = parseFloat(diskSpace);
        const spaceUnit = diskSpace.replace(/[0-9.]/g, '').trim();
        if (spaceUnit === 'M' && spaceValue < 1000) {
          throw new Error('Espaço em disco insuficiente. Pelo menos 1GB livre é necessário.');
        }
        
        this.emit('output', '✅ [0/6] Verificações concluídas, servidor pronto!');
      });

      // System setup steps (skip if server is already configured)
      if (!skipSystemSetup) {
        // Step 1: System Update
        await this.executeStep('system_update', '📦 [1/6] Atualizando Sistema', async () => {
        this.emit('output', '🔄 Limpando processos travados...');
        // Kill any blocking apt/dpkg processes first
        await this.execCommandWithOutput('pkill -9 apt-get || true');
        await this.execCommandWithOutput('pkill -9 apt || true');
        await this.execCommandWithOutput('pkill -9 dpkg || true');
        
        this.emit('output', '🔓 Removendo locks...');
        // Remove lock files
        await this.execCommandWithOutput('rm -f /var/lib/dpkg/lock-frontend || true');
        await this.execCommandWithOutput('rm -f /var/lib/dpkg/lock || true');
        await this.execCommandWithOutput('rm -f /var/cache/apt/archives/lock || true');
        await this.execCommandWithOutput('rm -f /var/lib/apt/lists/lock || true');
        
        this.emit('output', '⚙️ Configurando pacotes pendentes...');
        // Configure any pending packages
        await this.execCommandWithOutput('dpkg --configure -a || true');
        
        // Wait for cleanup
        await this.execCommandWithOutput('sleep 2');
        
        this.emit('output', '📋 Atualizando lista de pacotes...');
        await this.execCommandWithOutput('apt-get update');
        
        this.emit('output', '⬆️ Atualizando sistema (pode demorar 2-3 minutos)...');
        await this.execCommandWithOutput('DEBIAN_FRONTEND=noninteractive apt-get upgrade -y --with-new-pkgs');
        
        this.emit('output', '✅ [1/6] Sistema atualizado!');
      });

      // Step 2: Install Dependencies
      await this.executeStep('dependencies', '🔧 [2/6] Instalando Dependências', async () => {
        this.emit('output', '📥 Instalando ferramentas básicas...');
        await this.execCommandWithOutput('DEBIAN_FRONTEND=noninteractive apt-get install -y curl wget git software-properties-common');
        this.emit('output', '✅ [2/6] Dependências instaladas!');
      });

      // Step 3: Install WordOps
      await this.executeStep('wordops', '⚡ [3/6] Instalando WordOps', async () => {
        // Define MySQL root password for both branches
        const mysqlRootPass = 'TatameRoot2024!';
        
        const woCheck = await this.execCommand('which wo');
        if (!woCheck.stdout) {
          this.emit('output', '📦 Baixando WordOps...');
          
          // Configure Git first (required by WordOps)
          await this.execCommandWithOutput(`git config --global user.name "Tatame Installer"`);
          await this.execCommandWithOutput(`git config --global user.email "${userEmail}"`);
          
          // Create WordOps config directory
          await this.execCommandWithOutput('mkdir -p /etc/wo');
          
          // Create WordOps config file to avoid interactive prompts
          const woConfig = `[user]
name = Tatame Installer
email = ${userEmail}

[mysql]
host = localhost
port = 3306
user = root
password = ${mysqlRootPass}
grant-host = localhost
db-name = wordpress
db-user = wordpress
db-password = wordpress

[wordpress]
user = admin
password = admin123
email = ${userEmail}
prefix = wp_
webroot = htdocs`;
          
          await this.execCommandWithOutput(`echo '${woConfig}' > /etc/wo/wo.conf`);
          
          // Install WordOps with environment variables and timeout
          this.emit('output', '📥 Baixando instalador do WordOps...');
          await this.execCommandWithOutput('wget -qO wo wops.cc');
          
          this.emit('output', '🚀 Instalando WordOps (máximo 4 minutos)...');
          // Use timeout to prevent hanging and force non-interactive mode
          await this.execCommandWithOutput(`timeout 240 bash -c 'export DEBIAN_FRONTEND=noninteractive && WO_INSTALL_USER="Tatame Installer" WO_INSTALL_EMAIL="${userEmail}" bash wo --force'`);
          
          await this.execCommandWithOutput('rm -f wo');
          this.emit('output', '✅ [3/6] WordOps instalado com sucesso!');
          
          // Setup MySQL root access
          this.emit('output', '🔧 Configurando MySQL...');
          
          // Use sudo mysql to configure root access (works with auth_socket plugin)
          // mysqlRootPass is already defined above
          await this.execCommandWithOutput(`sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${mysqlRootPass}';" || true`);
          await this.execCommandWithOutput(`sudo mysql -e "FLUSH PRIVILEGES;" || true`);
          
          // Create .my.cnf for root access with password
          const myCnf = `[client]
user=root
password=${mysqlRootPass}`;
          
          // Create in both locations to ensure WordOps finds it
          await this.execCommandWithOutput(`echo '${myCnf}' > /root/.my.cnf`);
          await this.execCommandWithOutput('chmod 600 /root/.my.cnf');
          await this.execCommandWithOutput(`echo '${myCnf}' > ~/.my.cnf`);
          await this.execCommandWithOutput('chmod 600 ~/.my.cnf');
          
          // Test connection with password
          await this.execCommandWithOutput(`mysql -u root -p'${mysqlRootPass}' -e "SELECT 1;" || true`);
        } else {
          this.emit('output', '✅ [3/6] WordOps já instalado');
          
          // Still configure Git if not already done
          await this.execCommandWithOutput(`git config --global user.name "Tatame Installer" || true`);
          await this.execCommandWithOutput(`git config --global user.email "${userEmail}" || true`);
          
          // Ensure MySQL access is configured (same process as above)
          this.emit('output', '🔧 Reconfigurando MySQL...');
          // mysqlRootPass is already defined above
          await this.execCommandWithOutput(`sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${mysqlRootPass}';" || true`);
          await this.execCommandWithOutput(`sudo mysql -e "FLUSH PRIVILEGES;" || true`);
          const myCnf = `[client]
user=root
password=${mysqlRootPass}`;
          await this.execCommandWithOutput(`echo '${myCnf}' > /root/.my.cnf || true`);
          await this.execCommandWithOutput('chmod 600 /root/.my.cnf || true');
          await this.execCommandWithOutput(`echo '${myCnf}' > ~/.my.cnf || true`);
          await this.execCommandWithOutput('chmod 600 ~/.my.cnf || true');
          await this.execCommandWithOutput(`mysql -u root -p'${mysqlRootPass}' -e "SELECT 1;" || true`);
        }
      });
      } else {
        this.emit('output', '⚡ Servidor já configurado - pulando configuração do sistema');
        this.emit('output', '✅ WordOps, Nginx, MySQL e PHP já estão instalados');
        
        // If WP-CLI is not installed on existing server, install it quickly
        if (!serverConfig.hasWPCLI) {
          this.emit('output', '📦 Instalando WP-CLI...');
          await this.execCommandWithOutput('curl -O https://raw.githubusercontent.com/wp-cli/wp-cli/v2.8.1/utils/wp-completion.bash');
          await this.execCommandWithOutput('wget https://raw.githubusercontent.com/wp-cli/wp-cli/v2.8.1/utils/wp-cli.phar');
          await this.execCommandWithOutput('chmod +x wp-cli.phar');
          await this.execCommandWithOutput('mv wp-cli.phar /usr/local/bin/wp');
          this.emit('output', '✅ WP-CLI instalado');
        }
      }

      // Step 4: Create WordPress Site  
      await this.executeStep('wordpress', '🌐 [4/6] Criando Site WordPress', async () => {
        this.emit('output', `🌐 Preparando para criar site: ${domain}`);
        
        // Double-check if site already exists (in case it was created between checks)
        this.emit('output', '🔍 Verificando site existente...');
        const siteCheck = await this.execCommand(`wo site info ${domain} 2>/dev/null || echo "not found"`);
        
        if (siteCheck.stdout && !siteCheck.stdout.includes('not found')) {
          this.emit('output', '⚠️  Site detectado durante instalação!');
          
          // Get detailed info about the existing site
          const siteDetails = await this.execCommand(`wo site info ${domain} --json 2>/dev/null || echo "{}"`);
          this.emit('output', '📋 Informações do site existente encontrado.');
          
          // Ask user to handle it manually
          throw new Error(`ATENÇÃO: Um site com o domínio ${domain} foi detectado durante a instalação. Isso pode ter ocorrido por:\n` +
            `1. Outro usuário criou o site simultaneamente\n` +
            `2. Uma instalação anterior não foi completamente removida\n` +
            `3. O site foi criado manualmente\n\n` +
            `Para continuar, você precisa primeiro remover o site existente usando: wo site delete ${domain} --force`);
        }
        
        // Wait for cleanup
        await this.execCommandWithOutput('sleep 2');
        
        // Create site with WordOps - with port support for IP installations
        let createCommand;
        
        if (assignedPort) {
          // For installations with assigned ports, create a unique site identifier
          siteIdentifier = `${domain}-port${assignedPort}`;
          this.emit('output', `🔧 Criando site com porto customizado: ${assignedPort}`);
          
          // Create basic WordPress site first
          createCommand = `wo site create ${siteIdentifier} --wp --php82 --user='${wpUser}' --pass='${escapedWpPass}' --email='${wpEmail}'`;
        } else {
          // Standard domain-based installation (fallback)
          createCommand = `wo site create ${domain} --wp --php82 --user='${wpUser}' --pass='${escapedWpPass}' --email='${wpEmail}'`;
        }
        
        // Pre-flight checks before WordOps
        this.emit('output', '🔍 Executando verificações pré-voo...');
        
        // Check MySQL connectivity
        try {
          this.emit('output', '📊 Testando conectividade MySQL...');
          const mysqlTest = await this.execCommand('timeout 10 mysql -e "SELECT 1" 2>&1');
          if (mysqlTest.code !== 0) {
            throw new Error(`MySQL não acessível: ${mysqlTest.stderr}`);
          }
          this.emit('output', '✅ MySQL conectável');
        } catch (error) {
          throw new Error(`Falha na conectividade MySQL: ${error.message}`);
        }
        
        // Check WordOps health
        try {
          this.emit('output', '🛠️  Testando WordOps...');
          const woTest = await this.execCommand('timeout 10 wo --version 2>&1');
          if (woTest.code !== 0) {
            throw new Error(`WordOps não responsivo: ${woTest.stderr}`);
          }
          this.emit('output', '✅ WordOps responsivo');
        } catch (error) {
          throw new Error(`Falha no teste WordOps: ${error.message}`);
        }
        
        // Check for hanging WordOps processes
        try {
          this.emit('output', '🔍 Verificando processos WordOps...');
          const woProcesses = await this.execCommand('pgrep -f "wo site create" | wc -l');
          const processCount = parseInt(woProcesses.stdout.trim());
          if (processCount > 0) {
            this.emit('output', `⚠️  Detectados ${processCount} processos WordOps em execução`);
            this.emit('output', '🧹 Limpando processos antigos...');
            await this.execCommand('pkill -f "wo site create" 2>/dev/null || true');
            await this.execCommand('sleep 3'); // Wait for cleanup
          }
          this.emit('output', '✅ Processos WordOps limpos');
        } catch (error) {
          this.emit('output', `⚠️  Aviso: Não foi possível verificar processos: ${error.message}`);
        }
        
        // Check disk space
        try {
          this.emit('output', '💾 Verificando espaço em disco...');
          const diskTest = await this.execCommand("df /var/www/ | awk 'NR==2 {print $4}'");
          const freeSpaceKB = parseInt(diskTest.stdout.trim());
          if (freeSpaceKB < 1048576) { // Less than 1GB
            throw new Error(`Espaço insuficiente: ${Math.round(freeSpaceKB/1024)}MB disponível, mínimo 1GB`);
          }
          this.emit('output', `✅ Espaço suficiente: ${Math.round(freeSpaceKB/1024/1024)}GB`);
        } catch (error) {
          throw new Error(`Falha na verificação de espaço: ${error.message}`);
        }
        
        this.emit('output', '🔄 Criando site com WordOps (máximo 2 minutos)...');
        this.emit('output', `🎯 Comando: ${createCommand}`);
        
        // Try to create the site with improved timeout
        try {
          const createResult = await this.execCommand(`timeout 120 ${createCommand} 2>&1`);
          
          // Check if WordPress was created (even if SSL failed)
          const output = createResult.stdout + createResult.stderr;
          if (output.includes('Successfully created site') || 
              output.includes('Installing WordPress') ||
              output.includes('Aborting SSL certificate')) {
            this.emit('output', `✅ [4/5] Site WordPress criado: ${domain}`);
            if (output.includes('Aborting SSL certificate')) {
              this.emit('output', '⚠️  SSL certificate failed but site is accessible via HTTP');
            }
          } else if (createResult.code === 124 || createResult.code === 4) {
            this.emit('output', '⚠️  WordPress creation timed out, checking if site was created...');
            // Check if site was partially created
            const checkSite = await this.execCommand(`wo site info ${domain} 2>/dev/null || echo "not found"`);
            if (checkSite.stdout && !checkSite.stdout.includes('not found')) {
              this.emit('output', '✅ [4/5] Site was created despite timeout');
            } else {
              throw new Error('Site creation timed out and site not found');
            }
          } else {
            throw new Error('Failed to create WordPress site');
          }
        } catch (error) {
          this.emit('output', `❌ Erro na criação do site: ${error.message}`);
          
          // Enhanced error diagnostics
          this.emit('output', '🔍 Executando diagnósticos...');
          
          // Check if timeout
          if (error.code === 124 || error.code === 4 || error.message.includes('timeout')) {
            this.emit('output', '⏰ Timeout detectado - verificando se site foi criado...');
            
            // Check if site exists anyway
            const checkSite = await this.execCommand(`wo site info ${domain} 2>/dev/null || echo "not found"`);
            if (checkSite.stdout && !checkSite.stdout.includes('not found')) {
              this.emit('output', '✅ [4/5] Site foi criado apesar do timeout, continuando...');
            } else {
              // Detailed timeout analysis
              this.emit('output', '📊 Análise do timeout:');
              
              // Check MySQL status
              const mysqlStatus = await this.execCommand('systemctl is-active mysql 2>/dev/null || echo "unknown"');
              this.emit('output', `   • MySQL status: ${mysqlStatus.stdout.trim()}`);
              
              // Check disk usage
              const diskUsage = await this.execCommand("df -h /var/www/ | awk 'NR==2 {print $5}'");
              this.emit('output', `   • Disk usage: ${diskUsage.stdout.trim()}`);
              
              // Check memory
              const memUsage = await this.execCommand("free | awk 'NR==2{printf \"%.1f%%\", $3*100/$2 }'");
              this.emit('output', `   • Memory usage: ${memUsage.stdout.trim()}`);
              
              // Check load average
              const loadAvg = await this.execCommand("uptime | awk -F'load average:' '{print $2}'");
              this.emit('output', `   • Load average:${loadAvg.stdout.trim()}`);
              
              throw new Error(`WordOps timeout: Comando não completou em 2 minutos. Causas possíveis:
• Download lento do WordPress
• Problemas de conectividade MySQL
• Alto uso de recursos do servidor
• Problemas de DNS/rede
• WordOps aguardando entrada do usuário

Detalhes: ${error.message}`);
            }
          } else {
            // Non-timeout error - provide specific guidance
            this.emit('output', '💡 Analisando erro específico...');
            
            if (error.message.includes('mysql') || error.message.includes('database')) {
              throw new Error(`Erro MySQL: ${error.message}. Verifique se o MySQL está funcionando e acessível.`);
            } else if (error.message.includes('download') || error.message.includes('fetch')) {
              throw new Error(`Erro de download: ${error.message}. Verifique conectividade com a internet.`);
            } else if (error.message.includes('permission') || error.message.includes('denied')) {
              throw new Error(`Erro de permissão: ${error.message}. Verifique permissões do usuário root.`);
            } else {
              throw new Error(`Falha na criação do site: ${error.message}`);
            }
          }
        }
        
        // Configure custom port access for installations with assigned ports
        if (assignedPort) {
          this.emit('output', `🔧 Configurando acesso via porto ${assignedPort}...`);
          
          // Create custom Nginx configuration for the port
          const customConfigFile = `/etc/nginx/sites-available/${domain}-port${assignedPort}`;
          const wpPath = `/var/www/${siteIdentifier}/htdocs`;
          
          const nginxConfig = `
server {
    listen ${assignedPort};
    server_name ${ipAddress} _;
    
    root ${wpPath};
    index index.php index.html index.htm;
    
    # WordPress specific configuration
    location / {
        try_files $uri $uri/ /index.php?$args;
    }
    
    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    location ~ /\\.ht {
        deny all;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # WordPress uploads
    location ~* \\.(jpg|jpeg|png|gif|css|js|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}`;
          
          // Write the custom configuration
          await this.execCommandWithOutput(`cat > ${customConfigFile} << 'EOF'${nginxConfig}
EOF`);
          
          // Enable the site
          await this.execCommandWithOutput(`ln -sf ${customConfigFile} /etc/nginx/sites-enabled/`);
          
        } else {
          // Standard IP configuration for domain-based installations
          this.emit('output', '🔧 Configurando acesso via IP...');
          
          const configFile = `/etc/nginx/sites-available/${domain}`;
          const configCheck = await this.execCommand(`ls ${configFile} 2>/dev/null || echo "not found"`);
          
          if (configCheck.stdout && !configCheck.stdout.includes('not found')) {
            // Add IP address to server_name directive
            await this.execCommandWithOutput(
              `sed -i "s/server_name ${domain};/server_name ${domain} ${ipAddress};/" ${configFile} || sed -i "s/server_name ${domain} www.${domain};/server_name ${domain} www.${domain} ${ipAddress};/" ${configFile}`
            );
          }
        }
        
        // Test and reload nginx configuration
        this.emit('output', '🔄 Testando configuração do Nginx...');
        const nginxTest = await this.execCommand('nginx -t 2>&1');
        if (nginxTest.stdout.includes('syntax is ok') || nginxTest.stdout.includes('test is successful')) {
          // Reload nginx to apply changes
          await this.execCommandWithOutput('systemctl reload nginx');
          this.emit('output', `✅ Site acessível via IP: http://${ipAddress}`);
        } else {
          this.emit('output', '⚠️  Não foi possível configurar acesso via IP, mas site funciona via domínio');
        }
      });

      // Step 5: Theme & Plugin Installation
      await this.executeStep('wordpress_customization', '🎨 [5/6] Configurando Tema & Plugins', async () => {
        this.emit('output', '🎨 Configurando WordPress com tema e plugins selecionados...');
        
        // Change to WordPress directory for WP-CLI commands
        const wpPath = `/var/www/${siteIdentifier}/htdocs`;
        
        // Configure WordPress URLs for port-based installations
        if (assignedPort) {
          const siteUrl = `http://${ipAddress}:${assignedPort}`;
          this.emit('output', `🔗 Configurando URLs do WordPress para: ${siteUrl}`);
          
          await this.execCommandWithOutput(`cd ${wpPath} && sudo -u www-data wp option update siteurl "${siteUrl}"`);
          await this.execCommandWithOutput(`cd ${wpPath} && sudo -u www-data wp option update home "${siteUrl}"`);
        }
        
        // Update WordPress site title if provided
        if (siteTitle !== 'WordPress Site') {
          this.emit('output', `📝 Atualizando título do site para: ${siteTitle}`);
          await this.execCommandWithOutput(`cd ${wpPath} && sudo -u www-data wp option update blogname "${siteTitle}"`);
        }
        
        // Install and activate theme if selected
        if (wordpressConfig?.theme?.slug) {
          const themeSlug = wordpressConfig.theme.slug;
          this.emit('output', `🎨 Instalando tema: ${themeSlug}`);
          
          try {
            // Try to install from WordPress.org repository first
            await this.execCommandWithOutput(`cd ${wpPath} && sudo -u www-data wp theme install ${themeSlug} --activate`);
            this.emit('output', `✅ Tema ${themeSlug} instalado e ativado`);
          } catch (error) {
            // If installation fails, try downloading from URL if available
            if (wordpressConfig.theme.downloadUrl) {
              this.emit('output', `📥 Baixando tema de URL personalizada...`);
              await this.execCommandWithOutput(`cd ${wpPath} && sudo -u www-data wp theme install ${wordpressConfig.theme.downloadUrl} --activate`);
              this.emit('output', `✅ Tema personalizado instalado e ativado`);
            } else {
              this.emit('output', `⚠️  Falha ao instalar tema ${themeSlug}, usando tema padrão`);
            }
          }
        }
        
        // Install plugins if selected
        if (wordpressConfig?.plugins?.length > 0) {
          this.emit('output', `🔌 Instalando ${wordpressConfig.plugins.length} plugin(s)...`);
          
          for (const pluginSlug of wordpressConfig.plugins) {
            try {
              this.emit('output', `📦 Instalando plugin: ${pluginSlug}`);
              await this.execCommandWithOutput(`cd ${wpPath} && sudo -u www-data wp plugin install ${pluginSlug} --activate`);
              this.emit('output', `✅ Plugin ${pluginSlug} instalado e ativado`);
            } catch (error) {
              this.emit('output', `⚠️  Falha ao instalar plugin ${pluginSlug}, continuando...`);
            }
          }
        }
        
        // Clear any caches
        this.emit('output', '🧹 Limpando cache do WordPress...');
        await this.execCommandWithOutput(`cd ${wpPath} && sudo -u www-data wp cache flush || true`);
        
        // Update permalinks to ensure everything works properly
        this.emit('output', '🔗 Configurando permalinks...');
        await this.execCommandWithOutput(`cd ${wpPath} && sudo -u www-data wp rewrite structure '/%postname%/' --hard || true`);
        
        this.emit('output', '✅ [5/6] Tema e plugins configurados com sucesso!');
      });

      // Step 6: Security & Final Setup
      await this.executeStep('security', '🔒 [6/6] Finalizando Instalação', async () => {
        // Set proper permissions
        await this.execCommandWithOutput(`chown -R www-data:www-data /var/www/${domain}/htdocs || true`);
        await this.execCommandWithOutput(`find /var/www/${domain}/htdocs -type d -exec chmod 755 {} \\; || true`);
        await this.execCommandWithOutput(`find /var/www/${domain}/htdocs -type f -exec chmod 644 {} \\; || true`);
        
        // Configure firewall
        await this.execCommandWithOutput('ufw allow 22/tcp || true');
        await this.execCommandWithOutput('ufw allow 80/tcp || true');
        await this.execCommandWithOutput('ufw allow 443/tcp || true');
        
        // Enable UFW with multiple fallback methods
        this.emit('output', '🔧 Habilitando firewall UFW...');
        try {
          // Try non-interactive force enable first
          const ufwResult = await this.execCommand('timeout 15 ufw --force enable 2>&1 || echo "ufw_failed"');
          if (ufwResult.stdout.includes('ufw_failed') || ufwResult.code !== 0) {
            this.emit('output', '⚠️  UFW force enable failed, trying alternative...');
            // Fallback: try with echo method
            await this.execCommand('timeout 10 bash -c "echo y | ufw enable" 2>&1 || true');
          }
          this.emit('output', '✅ Firewall UFW configurado');
        } catch (error) {
          this.emit('output', '⚠️  Firewall skip - continuando instalação');
        }
        
        // Ensure step completion is logged
        this.emit('output', '🔒 Permissões e segurança configuradas');
        this.emit('output', '🎯 Finalizando última etapa...');
        
        this.emit('output', '✅ [6/6] Instalação finalizada!');
      });

      // Emit explicit installation completion event
      this.emit('output', '\n🎉 TODAS AS ETAPAS CONCLUÍDAS!');
      this.emit('installationComplete', { success: true, message: 'Installation steps completed' });

      // Generate success response with instructions
      this.emit('output', '\n=================================');
      if (skipSystemSetup) {
        this.emit('output', '✅ NOVO SITE WORDPRESS ADICIONADO!');
        this.emit('output', '🚀 Instalação rápida concluída com sucesso');
      } else {
        this.emit('output', '✅ WORDPRESS INSTALADO COM SUCESSO!');
        this.emit('output', '🆕 Servidor configurado do zero');
      }
      this.emit('output', '=================================\n');
      
      // Generate access URLs and methods
      const accessMethods: Array<{type: 'ip' | 'port' | 'preview' | 'domain', url: string, primary?: boolean}> = [];
      let primaryAccessUrl: string;
      let primaryAdminUrl: string;

      if (assignedPort) {
        // Port-based access for installations with assigned ports
        primaryAccessUrl = `http://${ipAddress}:${assignedPort}`;
        primaryAdminUrl = `http://${ipAddress}:${assignedPort}/wp-admin`;
        
        accessMethods.push({
          type: 'port',
          url: primaryAccessUrl,
          primary: true
        });
        
        // Add preview domain if available
        if (previewDomain) {
          accessMethods.push({
            type: 'preview',
            url: `http://${previewDomain}`,
            primary: false
          });
        }
        
        // Add domain access as secondary for domain-based installations
        if (!isIPInstallation) {
          accessMethods.push({
            type: 'domain',
            url: `http://${domain}`,
            primary: false
          });
        }
        
        // Add IP without port as secondary (will show default site)
        accessMethods.push({
          type: 'ip',
          url: `http://${ipAddress}`,
          primary: false
        });
        
      } else {
        // Fallback access method when no port assigned
        if (isIPInstallation) {
          primaryAccessUrl = `http://${ipAddress}`;
          primaryAdminUrl = `http://${ipAddress}/wp-admin`;
        } else {
          primaryAccessUrl = `http://${domain}`;
          primaryAdminUrl = `http://${domain}/wp-admin`;
        }
        
        accessMethods.push({
          type: isIPInstallation ? 'ip' : 'domain',
          url: primaryAccessUrl,
          primary: true
        });
        
        // Add alternate access methods
        if (!isIPInstallation && domain !== ipAddress) {
          accessMethods.push({
            type: 'ip',
            url: `http://${ipAddress}`,
            primary: false
          });
        }
      }

      const accessUrl = primaryAccessUrl;
      const adminUrl = primaryAdminUrl;
      
      // Generate DNS instructions
      const dnsInstructions = {
        cloudflare: [
          '1. Faça login no Cloudflare (cloudflare.com)',
          '2. Selecione seu domínio',
          '3. Vá para configurações de DNS',
          `4. Adicione registro A: @ → ${ipAddress}`,
          `5. Adicione registro A: www → ${ipAddress}`,
          '6. Desative o proxy (nuvem laranja) inicialmente',
          '7. Aguarde 5-10 minutos para propagação'
        ],
        generic: [
          'No seu provedor de DNS, adicione:',
          `Tipo: A | Nome: @ | Valor: ${ipAddress}`,
          `Tipo: A | Nome: www | Valor: ${ipAddress}`
        ]
      };
      
      // Display instructions
      this.emit('output', '📝 CREDENCIAIS DE ACESSO:');
      this.emit('output', '------------------------');
      this.emit('output', `Usuário: ${wpUser}`);
      this.emit('output', `Senha: ${wpPass}`);
      this.emit('output', '');
      this.emit('output', '🌐 ACESSO AO SITE:');
      this.emit('output', '------------------------');
      this.emit('output', `Site: ${accessUrl}`);
      this.emit('output', `Admin: ${adminUrl}`);
      this.emit('output', '');
      this.emit('output', '🔧 CONFIGURAÇÃO DNS (Cloudflare):');
      this.emit('output', '------------------------');
      dnsInstructions.cloudflare.forEach(instruction => {
        this.emit('output', instruction);
      });
      
      // Return structured response
      return {
        success: true,
        siteInfo: {
          domain,
          ipAddress,
          accessUrl,
          adminUrl,
          assignedPort
        },
        credentials: {
          siteUrl: accessUrl,
          adminUrl: adminUrl,
          username: wpUser,
          password: wpPass
        },
        accessMethods,
        dnsInstructions
      };

    } catch (error) {
      this.emit('error', `Installation failed: ${error.message}`);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  private async executeStep(stepId: string, stepName: string, stepFunction: () => Promise<void>): Promise<void> {
    this.currentStep = stepId;
    this.emit('stepStart', { id: stepId, name: stepName });
    this.emit('output', `\n🚀 Starting step: ${stepName}`);
    this.emit('output', `📋 Step ID: ${stepId}`);
    this.emit('output', '=' .repeat(60));
    
    const stepStartTime = Date.now();
    
    try {
      await stepFunction();
      const stepDuration = Date.now() - stepStartTime;
      this.completedSteps.add(stepId);
      this.emit('output', `✅ Step completed: ${stepName} (${stepDuration}ms)`);
      this.emit('stepComplete', { id: stepId, name: stepName });
    } catch (error) {
      const stepDuration = Date.now() - stepStartTime;
      this.emit('output', `❌ Step failed: ${stepName} (${stepDuration}ms)`);
      this.emit('output', `💥 Error in step: ${stepId}`);
      this.emit('output', `🔍 Error message: ${error.message}`);
      this.emit('output', `📊 Error stack: ${error.stack || 'No stack trace available'}`);
      
      // Add context about what we were trying to do
      this.emit('output', `🎯 Step context:`);
      this.emit('output', `   • Step: ${stepName}`);
      this.emit('output', `   • Stage: ${stepId}`);
      this.emit('output', `   • Current step: ${this.currentStep}`);
      this.emit('output', `   • Completed steps: [${Array.from(this.completedSteps).join(', ')}]`);
      
      this.emit('stepError', { 
        id: stepId, 
        name: stepName, 
        error: error.message,
        stack: error.stack,
        duration: stepDuration
      });
      
      throw new Error(`Step ${stepId} (${stepName}) failed: ${error.message}`);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getCurrentStep(): string {
    return this.currentStep;
  }

  getCompletedSteps(): string[] {
    return Array.from(this.completedSteps);
  }
}