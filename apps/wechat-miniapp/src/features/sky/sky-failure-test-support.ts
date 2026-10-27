import { createResourceFailureEpisode } from '../../services/resource-failure-episode';

/** Same stateful owner at the page test boundary; no notification mocking. */
export function skyFailureTestEpisodes() {
  return { report: createResourceFailureEpisode(), catalog: createResourceFailureEpisode(),
    supplement: createResourceFailureEpisode() };
}
