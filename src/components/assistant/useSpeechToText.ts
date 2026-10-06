"use client";

import { useEffect, useRef, useState } from "react";

type SpeechRecognitionResultLike = {
    isFinal: boolean;
    0: { transcript: string };
};

type SpeechRecognitionEventLike = {
    resultIndex: number;
    results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionInstance = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: unknown) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
    if (typeof window === "undefined") {
        return undefined;
    }

    const w = window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function useSpeechToText(onResult: (text: string) => void) {
    const [isSupported] = useState(() => getSpeechRecognitionConstructor() !== undefined);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const shouldListenRef = useRef(false);
    const onResultRef = useRef(onResult);

    // Updated after render, not during it, so a render React throws away can't leave a stale value here.
    useEffect(() => {
        onResultRef.current = onResult;
    });

    useEffect(() => {
        const SpeechRecognitionCtor = getSpeechRecognitionConstructor();

        if (!SpeechRecognitionCtor) {
            return;
        }

        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];

                if (result.isFinal) {
                    const transcript = result[0].transcript.trim();

                    if (transcript.length > 0) {
                        onResultRef.current(transcript);
                    }
                }
            }
        };

        recognition.onerror = () => {
            shouldListenRef.current = false;
            setIsListening(false);
        };

        recognition.onend = () => {
            if (shouldListenRef.current) {
                recognition.start();
            } else {
                setIsListening(false);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            shouldListenRef.current = false;
            recognition.stop();
        };
    }, []);

    function start() {
        if (!recognitionRef.current || shouldListenRef.current) {
            return;
        }

        shouldListenRef.current = true;
        setIsListening(true);
        recognitionRef.current.start();
    }

    function stop() {
        shouldListenRef.current = false;
        setIsListening(false);
        recognitionRef.current?.stop();
    }

    return { isSupported, isListening, start, stop };
}