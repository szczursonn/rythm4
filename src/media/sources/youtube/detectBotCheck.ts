const PLAYABILITY_STATUS_REASON_BOT_CHECK_PHRASES = ['not a bot'];

export const isPlayabilityStatusReasonBotCheck = (reason?: string) => {
    const reasonLowercase = reason?.toLowerCase() ?? '';
    return PLAYABILITY_STATUS_REASON_BOT_CHECK_PHRASES.some((phrase) => reasonLowercase.includes(phrase));
};

const INNERTUBE_ERROR_BOT_CHECK_PHRASE = 'https://support.google.com/websearch/answer/86640'; // unusual traffic help article

export const isInnertubeErrorBotCheck = (err: unknown) => {
    if (!(err instanceof Error) || !('info' in err) || typeof err.info !== 'string') {
        return false;
    }

    return err.info.includes(INNERTUBE_ERROR_BOT_CHECK_PHRASE);
};
