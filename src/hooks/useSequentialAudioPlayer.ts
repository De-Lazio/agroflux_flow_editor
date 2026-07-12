import { useCallback, useEffect, useRef, useState } from 'react';
import { readResourceObjectUrl } from '../utils/simulationResources';
import type { ResourceIndex } from '../utils/simulationResources';

/**
 * Joue une liste de chemins de ressources dans l'ordre, sur un seul <audio>
 * partagé — démarrer une nouvelle lecture interrompt toujours la précédente
 * (jamais deux séquences en même temps, comme sur un vrai téléphone). `key`
 * identifie ce qui est en cours de lecture (ex. "intro", "prompt",
 * "option:mais") pour que l'UI mette en évidence le bon contrôle sans état
 * dupliqué ailleurs. Réutilisable tel quel en Phase 6 pour la séquence audio
 * d'une réponse "result" (mêmes chemins littéraux, voir simulationResources.ts).
 */
export const useSequentialAudioPlayer = () => {
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  // Incrémenté à chaque play()/stop() : les callbacks d'une lecture périmée
  // (ex. l'utilisateur a cliqué un autre bouton entre-temps) s'auto-annulent
  // en se comparant à leur propre jeton plutôt que d'annuler des Promises.
  const tokenRef = useRef(0);
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  useEffect(() => {
    const el = new Audio();
    audioElRef.current = el;
    return () => {
      el.pause();
      el.removeAttribute('src');
    };
  }, []);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    audioElRef.current?.pause();
    setPlayingKey(null);
  }, []);

  const playOnePath = async (index: ResourceIndex, path: string, token: number): Promise<void> => {
    const url = await readResourceObjectUrl(index, path);
    if (!url || tokenRef.current !== token) return;

    const el = audioElRef.current;
    if (!el) return;

    await new Promise<void>((resolve) => {
      const onEnd = () => {
        el.removeEventListener('ended', onEnd);
        el.removeEventListener('error', onEnd);
        URL.revokeObjectURL(url);
        resolve();
      };
      el.addEventListener('ended', onEnd);
      el.addEventListener('error', onEnd);
      el.src = url;
      el.play().catch(onEnd);
    });
  };

  const play = useCallback(async (key: string, index: ResourceIndex, paths: string[], fallback?: string) => {
    tokenRef.current += 1;
    const token = tokenRef.current;
    setPlayingKey(key);

    for (const path of paths) {
      if (tokenRef.current !== token) return;
      const target = index.byPath.has(path) ? path : fallback && index.byPath.has(fallback) ? fallback : null;
      if (target) await playOnePath(index, target, token);
    }

    if (tokenRef.current === token) setPlayingKey(null);
  }, []);

  return { play, stop, playingKey };
};
