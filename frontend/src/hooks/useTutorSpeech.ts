import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import type { Message } from "@/hooks/useTutorSession";

type UseTutorSpeechParams = {
  t: TFunction;
  messages: Message[];
};

export function useTutorSpeech({ t, messages }: UseTutorSpeechParams) {
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const lastSeenTutorRef = useRef<number | null>(null);
  const lastSpokenTutorRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const getSpeechSynthesis = () =>
    typeof window === "undefined" ? undefined : window.speechSynthesis;
  const getUtteranceCtor = () =>
    typeof window === "undefined" ? undefined : window.SpeechSynthesisUtterance;

  useEffect(() => {
    const synth = getSpeechSynthesis();
    const UtteranceCtor = getUtteranceCtor();
    if (!synth || !UtteranceCtor) return;

    setSpeechSupported(true);

    const handleVoicesChanged = () => setSpeechSupported(true);
    synth.addEventListener?.("voiceschanged", handleVoicesChanged);

    return () => {
      synth.removeEventListener?.("voiceschanged", handleVoicesChanged);
    };
  }, []);

  useEffect(() => {
    if (!speechSupported) return;

    const synth = getSpeechSynthesis();
    const UtteranceCtor = getUtteranceCtor();
    if (!synth || !UtteranceCtor) return;

    let latestTutorIndex = -1;
    for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
      const msg = messages[idx];
      if (msg.role !== "tutor") continue;
      if (msg.streaming) continue;
      if (!msg.content?.trim()) continue;
      latestTutorIndex = idx;
      break;
    }

    if (latestTutorIndex === -1) return;

    lastSeenTutorRef.current = latestTutorIndex;

    if (!speechEnabled) return;
    if (latestTutorIndex === lastSpokenTutorRef.current) return;

    const text = messages[latestTutorIndex].content.trim();
    if (!text) return;

    lastSpokenTutorRef.current = latestTutorIndex;

    try {
      synth.cancel();
      setSpeaking(false);
      setSpeakingIndex(null);
      const utterance = new UtteranceCtor(text);
      utterance.lang = navigator.language || "en-US";

      utterance.onstart = () => {
        if (utteranceRef.current === utterance) {
          setSpeaking(true);
          setSpeakingIndex(latestTutorIndex);
        }
      };

      utterance.onerror = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          setSpeaking(false);
          setSpeakingIndex(null);
        }
        lastSpokenTutorRef.current = null;
        toast.error(t("tutor.speechError"));
      };

      utterance.onend = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          setSpeaking(false);
          setSpeakingIndex(null);
        }
      };

      utteranceRef.current = utterance;
      synth.speak(utterance);
    } catch (error) {
      utteranceRef.current = null;
      lastSpokenTutorRef.current = null;
      toast.error(t("tutor.speechError"));
    }
  }, [messages, speechEnabled, speechSupported, t]);

  const stopSpeech = () => {
    const synth = getSpeechSynthesis();
    if (synth) {
      synth.cancel();
      utteranceRef.current = null;
      setSpeaking(false);
      setSpeakingIndex(null);
    }
  };

  const toggleSpeech = () => {
    const synth = getSpeechSynthesis();
    const UtteranceCtor = getUtteranceCtor();
    if (!synth || !UtteranceCtor) {
      toast.error(t("tutor.speechNotSupported"));
      return;
    }

    setSpeechEnabled((prev) => {
      const next = !prev;
      if (!next) {
        synth.cancel();
        utteranceRef.current = null;
        setSpeaking(false);
        setSpeakingIndex(null);
      }
      return next;
    });
  };

  useEffect(() => {
    const synth = getSpeechSynthesis();
    return () => {
      synth?.cancel();
    };
  }, []);

  return {
    speechEnabled,
    speechSupported,
    speaking,
    speakingIndex,
    toggleSpeech,
    stopSpeech,
  };
}