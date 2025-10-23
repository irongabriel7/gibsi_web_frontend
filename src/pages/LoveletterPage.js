import React, { useState, useEffect } from "react";
import "../styles/Loveletter.css";

export default function LoveLetter() {
  const [step, setStep] = useState(0);
  const [beating, setBeating] = useState(false);
  const [hearts, setHearts] = useState([]);
  const [showText, setShowText] = useState(false);

  const messages = [
    "Aryame, I wanted to tell you something...\nClick on my heart once 💓",
    "Ende Priyapetta Aryame,\nSneham Mathram ❤️\nThis is for my love. \nclick 💖 heart again",
    "Ee Kathu ezthnath ninod olla sneham konda. \nNinne orkumbo love love feeling varum enikk. \nClick 💗 heart again",
    "I remember about our MIC room lekk varna kutti. \nKandal endoru jhaada pashe manasil onnum illathe nishku penn. \nClick 💗 heart again",
    "Ninde koode spend cheytha oro time and moment is memorable. \nAlways a sense of happiness. \nClick 💗 heart again",
    "Ninne ethree snehichalum mathiavilla. \You know how much I love you? \nClick 💗 heart again",
    "I know you want to spend your entire life with me. \nTime ayi varne ollu. \nClick 💗 heart again",
    "Give some time and patience. \nYou know right good things takes time. \nClick 💗 heart again",
    "Dear Aryame,\nI love you ❤️\nDo you love me too? If yes, click on my heart again 💖",
    "Aryame, I am still saying\nI love you in every Universe 💫💖"
  ];

  // --- Animate each letter while keeping spaces and newlines ---
  const getAnimatedMessage = (msg) =>
    msg.split(/(\s|\n)/).map((chunk, idx) => {
      if (chunk === "\n") return <br key={idx} />;
      if (chunk === " ") return <span key={idx}>&nbsp;</span>;
      return (
        <span
          key={idx}
          className="letter"
          style={{ animationDelay: `${idx * 0.05}s` }}
        >
          {chunk}
        </span>
      );
    });

  // --- Fade-in effect for each step ---
  useEffect(() => {
    setShowText(false);
    const timer = setTimeout(() => setShowText(true), 400);
    return () => clearTimeout(timer);
  }, [step]);

  const handleHeartClick = () => {
    if (beating) return;
    setBeating(true);
    setTimeout(() => setBeating(false), 800);

    // floating hearts
    const newHeart = { id: Date.now(), left: Math.random() * 80 + 10 };
    setHearts((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 2500);

    // go to next step
    if (step < messages.length - 1) {
      setTimeout(() => setStep((s) => s + 1), 600);
    }
  };

  return (
    <div className="love-bg">
      <div className={`love-border-box ${step === 9 ? "final-glow" : ""}`}>
        <div className="love-content">
          <h1 className="love-title">My Sweet Aryame</h1>

          <div
            className={`heart-container ${beating ? "heart-beat" : ""}`}
            onClick={handleHeartClick}
          >
            <svg
              className="neon-heart-svg"
              viewBox="0 0 512 512"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ff80b3" stopOpacity="1" />
                  <stop offset="70%" stopColor="#ff2970" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ff0055" stopOpacity="0.2" />
                </radialGradient>
                <linearGradient
                  id="facetGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#ff5f96" />
                  <stop offset="100%" stopColor="#ff2970" />
                </linearGradient>
                <filter id="glow">
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="10"
                    floodColor="#ff2970"
                  />
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="25"
                    floodColor="#ff4da6"
                  />
                </filter>
              </defs>

              <path
                d="M256 480C256 480 50 320 50 180C50 90 120 40 190 80C230 105 256 140 256 140C256 140 282 105 322 80C392 40 462 90 462 180C462 320 256 480 256 480Z"
                fill="url(#facetGradient)"
                stroke="#ff66a3"
                strokeWidth="4"
                filter="url(#glow)"
              />
              <g fill="none" stroke="url(#innerGlow)" strokeWidth="6">
                <path d="M256 400C256 400 100 280 100 180C100 120 150 90 200 120C230 140 256 170 256 170C256 170 282 140 312 120C362 90 412 120 412 180C412 280 256 400 256 400Z" />
                <path d="M256 350C256 350 130 260 130 180C130 140 165 120 205 140C230 155 256 180 256 180C256 180 282 155 307 140C347 120 382 140 382 180C382 260 256 350 256 350Z" />
                <path d="M256 310C256 310 160 240 160 180C160 160 180 145 210 160C230 170 256 190 256 190C256 190 282 170 302 160C332 145 352 160 352 180C352 240 256 310 256 310Z" />
              </g>
            </svg>
          </div>

          {/* Message fade in smoothly */}
          <div className={`love-message ${showText ? "fade-in" : "fade-out"}`}>
            {getAnimatedMessage(messages[step])}
          </div>
        </div>

        {/* Floating hearts */}
        {hearts.map((h) => (
          <span
            key={h.id}
            className="floating-heart"
            style={{ left: `${h.left}%` }}
          >
            💖
          </span>
        ))}
      </div>
    </div>
  );
}
