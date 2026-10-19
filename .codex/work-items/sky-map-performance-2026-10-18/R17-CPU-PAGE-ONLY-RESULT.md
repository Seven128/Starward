# R17 CPU/page-only phone result

Generation21 used the complete build `cc40d6e5a80563bcb52d20c3cacef4b8781e5e09410b48c04e375d26467a78b5`, delivered by official automatic preview and operator-bound before input. The [build](R17-CPU-PAGE-ONLY-TRIAL.md) is a frozen, synthetic diagnostic, not an adopted repair. Exact receipt, memory samples and five external evidence hashes are in [the result](R17-CPU-PAGE-ONLY-RESULT.json).

At 10.8°, the normal product Play button started the original clock. The diagnostic called the original guarded Pause after20 wall seconds; the actual screen showed04:30:19 and the Play icon. Preview was then cancelled without Apply. Debug and the performance overlay were off. There was no observed exit during this trial.

The nonempty13,998ms early window completed490 full CPU Scenes with8,404 BSC rows and6,519 actual SAO rows across19 tiles. It traversed4,900 BSC and144,345 SAO submitted stars. GPU submissions and synthetic accepted copies were both zero, as required by this diagnostic. One ready native copy occurred before freezing. The pinned cumulative synthetic begin/finish/publication counts were651/651/651 at export and840/840/840 after Pause and cancellation. Those cumulative counts are not pure window counts.

The raw Page observer reported492 submissions/492 callbacks, pending0/max2 at export; after cancellation672/672, pending0. No expanding acknowledgement backlog was observed in this window. Actual typed GPU uploads after Play were zero.

Counter-label correction during research handoff: the header's `K4327/10/0` means total/max enumerable own keys in raw Page `setData` payloads and key-count failures. It is not React commit count or commit duration. The result JSON and its task-local writer now use `pageEnumerableOwnKeysTotal` and `pageEnumerableOwnKeysMax`; observed numbers and raw evidence are unchanged. No actual React commit-count claim is supported by this observer.

The verified foreground Appbrand process still grew rapidly. Its first watch sample was958,063KiB total PSS/348,776KiB Unknown, and the final paused sample was1,873,329/1,220,568KiB. Swap PSS stayed40KiB. The watch started before actual Play and includes paused samples; these process measurements do not identify V8, a native allocator or GPU memory. GL/EGL accounting stayed near its initial level.

Recurring GPU work, renderer JS staging and native `present` are therefore not necessary for the observed growth. Full Scene work, real React/Taro publication, native Canvas RAF, image-loader lifetimes and real `surface.measureText` remain. The next bounded comparison changes only repeated exact native text measurements, retaining these other paths. The normal product candidate and continuous-play acceptance remain unresolved.
