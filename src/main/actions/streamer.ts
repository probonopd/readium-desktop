import { Action } from "redux";

import { Publication } from "readium-desktop/models/publication";

export const STREAMER_START = "STREAMER_START";
export const STREAMER_STOP = "STREAMER_STOP";
export const STREAMER_PUBLICATION_OPEN = "STREAMER_PUBLICATION_OPEN";
export const STREAMER_PUBLICATION_CLOSE = "STREAMER_PUBLICATION_CLOSE";

export interface StreamerAction extends Action {
    streamerUrl?: string;
    publication?: Publication;
}

export function start(streamerUrl: string): StreamerAction {
    return {
        type: STREAMER_START,
        streamerUrl,
    };
}

export function openPublication(publication: Publication): StreamerAction {
    return {
        type: STREAMER_PUBLICATION_OPEN,
        publication,
    };
}

export function closePublication(publication: Publication): StreamerAction {
    return {
        type: STREAMER_PUBLICATION_CLOSE,
        publication,
    };
}

export function stop() {
    return {
        type: STREAMER_STOP,
    };
}
