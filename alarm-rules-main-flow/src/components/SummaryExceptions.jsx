import { useEffect, useState } from 'react';
import { exceptionPresentation, exceptionTimeZone } from '../utils/exceptionPresentation';

export default function SummaryExceptions({ items, zone }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="summary-exceptions">
      {items.map((item) => {
        const row = exceptionPresentation(item, { now, timeZone: exceptionTimeZone(zone) });
        return (
          <div className="summary-exceptions__row" key={item.id}>
            <span className="summary-exceptions__name"><strong>{row.name}</strong><span>{row.type}</span></span>
            <span className="summary-exceptions__dates"><span>{row.date}</span><span>{row.recurrence}</span></span>
            <span className="summary-exceptions__hours">{row.behavior.map((line, index) => <span key={index}>{line}</span>)}</span>
          </div>
        );
      })}
    </div>
  );
}
