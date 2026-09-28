"use client";

import { useSpeechToText } from "./useSpeechToText";

type MicButtonProps = {
    onResult: (text: string) => void;
};

export default function MicButton({ onResult }: MicButtonProps) {
    const { isSupported, isListening, start, stop } = useSpeechToText(onResult);

    if (!isSupported) {
        return (
            <button
                type="button"
                disabled
                title="Voice input isn't supported in this browser"
                className="rounded border px-3 py-2 text-gray-500 opacity-50"
            >
                🎤
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={isListening ? stop: start}
            title={isListening ? "Stop listening" : "Start voice input"}
            className={isListening ? "rounded border border-red-600 bg-red-600 px-3 py-2 text-white" : "rounded border px-3 py-2"}
        >
            🎤
        </button>
    );
}