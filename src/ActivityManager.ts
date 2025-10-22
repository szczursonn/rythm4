import { setInterval, clearInterval } from 'node:timers';
import type { ActivityType, PresenceStatusData } from 'discord.js';
import type { MusicBot } from './MusicBot.ts';

export type MusicBotActivity = {
    name: string;
    type: ActivityType;
};

export class ActivityManager {
    private activityRotationIntervalRef: ReturnType<typeof setInterval> | null = null;
    private currentActivity: MusicBotActivity | null = null;

    #presenceStatus: PresenceStatusData = 'online';
    public get presenceStatus() {
        return this.#presenceStatus;
    }
    public set presenceStatus(value) {
        this.#presenceStatus = value;
        this.sendClientPresenceUpdate();
    }

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
        this.bot.logger.debug('Started activity rotation interval');

        this.rotateActivity();
    }

    public stopRotation() {
        if (this.activityRotationIntervalRef === null) {
            return;
        }

        clearInterval(this.activityRotationIntervalRef);
        this.activityRotationIntervalRef = null;
        this.bot.logger.debug('Stopped activity rotation interval');
    }

    private rotateActivity() {
        this.currentActivity =
            this.activities.length === 0
                ? null
                : this.activities[Math.floor(Math.random() * 0.99 * this.activities.length)]!;

        this.sendClientPresenceUpdate();
    }

    private sendClientPresenceUpdate() {
        if (this.bot.client.user === null) {
            this.bot.logger.error('ActivityManager: bot user is null');
            return;
        }

        this.bot.client.user.setPresence({
            status: this.presenceStatus,
            activities: this.currentActivity === null ? [] : [this.currentActivity],
        });

        this.bot.logger.info('Updated presence', {
            status: this.presenceStatus,
            activity: this.currentActivity,
        });
    }
}
