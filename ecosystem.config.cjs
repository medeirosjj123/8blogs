module.exports = {
  apps: [
    {
      name: 'tatame-api',
      script: './apps/api/dist/index.js',
      cwd: '/var/www/tatame',
      instances: 1, // Can be scaled to 'max' for production load balancing
      exec_mode: 'fork',
      
      // Environment configuration
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        LOG_LEVEL: 'info'
      },
      
      // Logging configuration
      log_type: 'json',
      error_file: '/var/log/tatame/api-error.log',
      out_file: '/var/log/tatame/api-out.log',
      log_file: '/var/log/tatame/api-combined.log',
      time: true,
      
      // Restart policies
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 4000,
      
      // Memory and performance
      max_memory_restart: '512M',
      node_args: '--max-old-space-size=512',
      
      // Production monitoring
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git',
        'tests'
      ],
      
      // Health monitoring
      health_check_grace_period: 5000,
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // Environment file
      env_file: '.env'
    }
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: ['tatame.afiliadofaixapreta.com.br'],
      ref: 'origin/main',
      repo: 'https://github.com/brunofarias-com/tatame.git',
      path: '/var/www/tatame',
      ssh_options: 'StrictHostKeyChecking=no',
      'pre-deploy-local': 'echo "Deploying to production..."',
      'post-deploy': 'pnpm install && npm run build:all && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': 'mkdir -p /var/log/tatame'
    }
  }
};