// src/hooks/useSpeechToText.js
import { useState, useRef, useCallback } from "react";
import { transcribeAudio } from "../utils/geminiConfig";

export function useSpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript("");

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });

      // 创建 MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // 停止所有音频轨道
        stream.getTracks().forEach((track) => track.stop());

        // 创建音频 Blob
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // 转换为文字
        setIsProcessing(true);
        try {
          const text = await transcribeAudio(audioBlob);
          setTranscript(text);
        } catch (err) {
          setError(err.message);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to access microphone. Please check permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  return {
    isRecording,
    isProcessing,
    error,
    transcript,
    startRecording,
    stopRecording,
    reset,
  };
}