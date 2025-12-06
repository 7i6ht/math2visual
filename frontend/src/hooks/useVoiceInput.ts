import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";

type RecognitionAlternative = {
  transcript?: string;
};

type RecognitionEvent = {
  results?: Array<Array<RecognitionAlternative>>;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  __m2vRecognitionInstance?: SpeechRecognitionInstance;
};

type UseVoiceInputParams = {
  t: TFunction;
  onTranscript: (transcript: string) => void;
};

export function useVoiceInput({ t, onTranscript }: UseVoiceInputParams) {
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const getSpeechRecognition = (): SpeechRecognitionConstructor | undefined => {
    if (typeof window === "undefined") return undefined;
    const { SpeechRecognition, webkitSpeechRecognition } = window as SpeechRecognitionWindow;
    return SpeechRecognition || webkitSpeechRecognition;
  };

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (SpeechRecognition) {
      setVoiceSupported(true);
    }
  }, []);

  const toggleVoice = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      toast.error(t("tutor.voiceNotSupported"));
      return;
    }

    if (listening) {
      const recognitionInstance = (window as SpeechRecognitionWindow).__m2vRecognitionInstance;
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      (window as SpeechRecognitionWindow).__m2vRecognitionInstance = recognition;
      recognition.continuous = false;
      recognition.lang = navigator.language || "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: RecognitionEvent) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          onTranscript(transcript);
        }
      };

      recognition.onerror = () => {
        toast.error(t("tutor.voiceError"));
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      setListening(true);
      recognition.start();
    } catch (error) {
      setListening(false);
      toast.error(t("tutor.voiceError"));
    }
  };

  return {
    listening,
    voiceSupported,
    toggleVoice,
  };
}

