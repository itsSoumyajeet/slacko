

const scheduler = {
  interval: null,
  isRunning: false,

  async start() {
    console.log('Starting Slack Connect scheduler...');
    
    
    await this.runScheduler();
    
    
    this.interval = setInterval(async () => {
      await this.runScheduler();
    }, 60 * 1000); 
  },

  async runScheduler() {
    if (this.isRunning) {
      console.log('Scheduler already running, skipping...');
      return;
    }

    this.isRunning = true;
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/slack/scheduler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Scheduler run completed: ${data.message}`);
      } else {
        console.error('Scheduler run failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Scheduler run error:', error);
    } finally {
      this.isRunning = false;
    }
  },

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('Scheduler stopped');
    }
  },
};


process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});


scheduler.start().catch(console.error);