class NotificationService {
  private _permission: NotificationPermission = 'default';
  private mutedChannels: Set<string> = new Set();

  constructor() {
    this.init();
    this.loadMutedChannels();
  }

  private async init() {
    if ('Notification' in window) {
      this._permission = Notification.permission;
    }
  }

  private loadMutedChannels() {
    const stored = localStorage.getItem('mutedChannels');
    if (stored) {
      try {
        const channels = JSON.parse(stored);
        this.mutedChannels = new Set(channels);
      } catch (error) {
        console.error('Error loading muted channels:', error);
      }
    }
  }

  private saveMutedChannels() {
    localStorage.setItem('mutedChannels', JSON.stringify(Array.from(this.mutedChannels)));
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this._permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  isChannelMuted(channelId: string): boolean {
    return this.mutedChannels.has(channelId);
  }

  muteChannel(channelId: string) {
    this.mutedChannels.add(channelId);
    this.saveMutedChannels();
  }

  unmuteChannel(channelId: string) {
    this.mutedChannels.delete(channelId);
    this.saveMutedChannels();
  }

  toggleChannelMute(channelId: string): boolean {
    if (this.isChannelMuted(channelId)) {
      this.unmuteChannel(channelId);
      return false;
    } else {
      this.muteChannel(channelId);
      return true;
    }
  }

  async showNotification(
    title: string,
    options?: {
      body?: string;
      icon?: string;
      tag?: string;
      data?: any;
      silent?: boolean;
    }
  ): Promise<void> {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    // Don't show notification if page is visible
    if (document.visibilityState === 'visible') {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: options?.icon || '/favicon.ico',
        badge: '/favicon.ico',
        silent: options?.silent || false,
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Handle click action if data is provided
        if (options?.data?.channelId) {
          // Could emit an event or call a callback here
          window.dispatchEvent(new CustomEvent('notification-click', { 
            detail: options.data 
          }));
        }
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async showMessageNotification(
    channelName: string,
    channelId: string,
    userName: string,
    message: string
  ): Promise<void> {
    // Don't show if channel is muted
    if (this.isChannelMuted(channelId)) {
      return;
    }

    await this.showNotification(`${userName} em #${channelName}`, {
      body: message,
      tag: `message-${channelId}`,
      data: { channelId }
    });
  }

  async showDirectMessageNotification(
    userName: string,
    message: string,
    channelId: string
  ): Promise<void> {
    // Don't show if channel is muted
    if (this.isChannelMuted(channelId)) {
      return;
    }

    await this.showNotification(`Mensagem de ${userName}`, {
      body: message,
      tag: `dm-${channelId}`,
      data: { channelId }
    });
  }

  playSound() {
    // Create a simple notification sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiy');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Could not play sound:', e));
  }
}

export default new NotificationService();