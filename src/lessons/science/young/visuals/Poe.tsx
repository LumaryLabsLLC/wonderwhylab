import { useCallback, useRef, useState } from 'react';
import { ExplainCard, PredictCard } from '../../../../stage/Predict';

/** One predict → observe → explain challenge. `actual` must be one of `options`. */
export interface Challenge {
  question: string;
  options: string[];
  actual: string;
  /** One short, true sentence explaining the result. */
  because: string;
}

/**
 * State for a run of challenges. The scene calls `observe()` when the experiment has shown the result;
 * it only counts once the child has made a prediction, so the guess always comes first.
 */
export function usePoe<T extends Challenge>(make: (prev: T | null) => T) {
  const [challenge, setChallenge] = useState<T>(() => make(null));
  const [guess, setGuessState] = useState<string | null>(null);
  const [seen, setSeen] = useState(false);
  const guessRef = useRef<string | null>(null);
  const seenRef = useRef(false);
  const makeRef = useRef(make);
  makeRef.current = make;

  const setGuess = useCallback((g: string) => {
    guessRef.current = g;
    setGuessState(g);
  }, []);

  const observe = useCallback(() => {
    if (guessRef.current === null || seenRef.current) return;
    seenRef.current = true;
    setSeen(true);
  }, []);

  const again = useCallback(() => {
    guessRef.current = null;
    seenRef.current = false;
    setGuessState(null);
    setSeen(false);
    setChallenge((c) => makeRef.current(c));
  }, []);

  /** True while the child has predicted and the experiment hasn't shown the result yet. */
  const waiting = guess !== null && !seen;
  return { challenge, guess, setGuess, seen, waiting, observe, again, guessRef };
}

/** Shows the prediction card, then the explanation once the result has been observed. */
export function PoePanel({
  x,
  y,
  w,
  poe,
}: {
  x: number;
  y: number;
  w: number;
  poe: ReturnType<typeof usePoe<Challenge>>;
}) {
  const { challenge, guess, setGuess, seen, again } = poe;
  return seen ? (
    <ExplainCard x={x} y={y} w={w} prediction={guess} actual={challenge.actual} because={challenge.because} onAgain={again} />
  ) : (
    <PredictCard x={x} y={y} w={w} question={challenge.question} options={challenge.options} prediction={guess} onPredict={setGuess} />
  );
}
