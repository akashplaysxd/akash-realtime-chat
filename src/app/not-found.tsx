"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
      color: "white",
      textAlign: "center",
    }}>
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes glitch {
          0% { clip-path: inset(0 0 90% 0); }
          20% { clip-path: inset(10% 0 60% 0); }
          40% { clip-path: inset(40% 0 40% 0); }
          60% { clip-path: inset(60% 0 20% 0); }
          80% { clip-path: inset(80% 0 5% 0); }
          100% { clip-path: inset(0 0 90% 0); }
        }

        .glitch {
          position: relative;
          display: inline-block;
        }

        .glitch::before,
        .glitch::after {
          content: '404';
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          overflow: hidden;
        }

        .glitch::before {
          left: 2px;
          text-shadow: -2px 0 red;
          animation: glitch 1s infinite linear alternate-reverse;
        }

        .glitch::after {
          left: -2px;
          text-shadow: -2px 0 blue;
          animation: glitch 1s infinite linear alternate;
        }
      `}</style>

      <div style={{
        animation: mounted ? "fadeIn 1s ease-in-out" : "none",
      }}>
        <h1 className="glitch" style={{
          fontSize: "8rem",
          color: "#00e6ff",
          textShadow: "0 0 20px rgba(0, 230, 255, 0.7)",
          margin: 0,
        }}>
          404
        </h1>
        <h2 style={{
          fontSize: "2rem",
          marginBottom: "10px",
        }}>
          Page Not Found
        </h2>
        <p style={{
          opacity: 0.7,
          marginBottom: "20px",
        }}>
          Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" style={{
          display: "inline-block",
          padding: "12px 25px",
          background: "#00e6ff",
          color: "black",
          textDecoration: "none",
          borderRadius: "30px",
          fontWeight: "bold",
          transition: "0.3s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "white";
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#00e6ff";
          e.currentTarget.style.transform = "scale(1)";
        }}
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
