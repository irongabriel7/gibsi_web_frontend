import React from "react";
import "../styles/About.css"; // Custom styles for scifi theme

export default function GibsiAbout() {
  return (
    <div className="gibsi-about-bg">
      <div className="gibsi-overlay" />
      <div className="gibsi-content">
        <h1 className="neon-title">GIBSI</h1>
        <h2 className="slogan">Unlock Tomorrow’s Markets Trade Engine</h2>

        <div className="about-text">
          <p>
            <span className="highlight">GIBSI</span> connects next-gen machine learning with the real pulse of the stock market.
          </p>

          <p className="quote">
            “When data meets intuition, future profits are no longer guesswork—they’re engineered.”
          </p>

          <p>
            Our journey:
            <br />
            <span className="mission">
              Empowering traders to find and act on signals hidden within intraday volatility and technical indicators—with room for human adjustment and feedback.
            </span>
          </p>

          <h3 className="section-title">Features</h3>
          <ul className="features-list">
            <li>Intuitive, modern dashboard with clean charts & analytics</li>
            <li>ML-based predictions synthesized from technical indicator streams</li>
            <li>Manual intervention: review, correct, and tune your strategy</li>
            <li>Designed for anyone seeking consistent, data-driven trading insights</li>
          </ul>

          <h3 className="section-title">Join GIBSI:</h3>
          <p>Trade, learn, and explore new possibilities in modern finance.</p>
        </div>

        <div className="note-text">
          <b>Note:</b> If you don’t want to create an account, use a test account.<br />
          UserID: <b>gibsitest*@gibsi</b> (where <b>*</b> is 1 to 5)<br />
          Password: <b>123456</b>
        </div>
      </div>
      <div className="chart-back" aria-hidden="true" />
    </div>
  );
}
