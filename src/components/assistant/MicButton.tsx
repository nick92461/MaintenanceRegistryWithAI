"use client";

import { useSpeechToText } from "./useSpeechToText";
import { MicIcon } from "@/components/layout/icons";

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
                aria-label="Voice input isn't supported in this browser"
                className="btn btn-secondary w-11 shrink-0 px-0"
            >
                <MicIcon />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={isListening ? stop: start}
            title={isListening ? "Stop listening" : "Start voice input"}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
            aria-pressed={isListening}
            className={`btn w-11 shrink-0 px-0 ${isListening ? "border border-red-600 bg-red-600 text-white hover:bg-red-700" : "btn-secondary"}`}
        >
            <MicIcon />
        </button>
    );
}
