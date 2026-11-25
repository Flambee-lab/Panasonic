import { useEffect, useState } from "react";

export default function TypingIp({ ip, active }) {
  const [visible, setVisible] = useState(active ? "" : ip);

  useEffect(() => {
    if (!active) {
      setVisible(ip);
      return undefined;
    }

    setVisible("");
    let i = 0;
    const step = Math.max(45, Math.min(120, 480 / Math.max(ip.length, 1)));

    const id = setInterval(() => {
      i += 1;
      setVisible(ip.slice(0, i));
      if (i >= ip.length) clearInterval(id);
    }, step);

    return () => clearInterval(id);
  }, [ip, active]);

  return (
    <span className="proc-typing-ip" aria-live="polite">
      <span className="proc-typing-ip__text">{visible}</span>
      {active && visible.length < ip.length && (
        <span className="proc-typing-ip__caret" aria-hidden="true" />
      )}
      {active && (
        <span className="proc-typing-ip__scan" aria-hidden="true" />
      )}
    </span>
  );
}
