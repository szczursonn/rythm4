import type { ActivityType } from 'discord.js';
import type { MusicBot } from './MusicBot.ts';

export type MusicBotActivity = {
    name: string;
    type: ActivityType;
};

export class ActivityManager {
    private activityRotationIntervalRef: ReturnType<typeof setInterval> | null = null;

    public constructor(
        public readonly bot: MusicBot,
        private readonly activities: MusicBotActivity[],
        private readonly activityRotationInterval: number
    ) {}

    public startRotation() {
        if (this.activityRotationIntervalRef !== null) {
            return;
        }

        this.activityRotationIntervalRef = setInterval(this.rotateActivity.bind(this), this.activityRotationInterval);
    }

    public stopRotation() {
        if (this.activityRotationIntervalRef === null) {
            return;
        }

        clearInterval(this.activityRotationIntervalRef);
        this.activityRotationIntervalRef = null;
    }

    public rotateActivity() {
        if (this.activities.length === 0 || this.bot.client.user === null) {
            return;
        }

        const newActivity = this.activities[Math.floor(Math.random() * 0.99 * this.activities.length)]!;

        this.bot.client.user.setPresence({
            activities: [newActivity],
        });

        this.bot.logger.info('Updated presence', {
            activity: newActivity,
        });
    }
}
