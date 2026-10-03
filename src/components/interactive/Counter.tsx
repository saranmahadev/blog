import { useState } from 'react';

export default function Counter() {
  const [n, setN] = useState(0);
  return (
    <div className="clay tone-sky not-prose my-8 flex items-center justify-between gap-4 p-5 font-sans text-base">
      <span>
        Clicked <strong className="tabular-nums">{n}</strong> times
      </span>
      <button
        type="button"
        onClick={() => setN(n + 1)}
        className="clay-sm clay-press tone-peach cursor-pointer px-5 py-2 font-medium"
      >
        Click me
      </button>
    </div>
  );
}
