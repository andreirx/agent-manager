STATUS: approved

- Codex feasibility is established: the recorded probe invokes parent `exec --sandbox read-only -C <isolated-dir> resume <id>`, returns the same native ID, and recalls `ORCHID-4729`. Its recorded native `turn_context` entries show the isolated cwd and read-only sandbox on both turns.
- SPS-L04 correctly requires persistence before retry; implementation must place that write on the retry path, not only in the terminal run record.
- SPS-L05 now explicitly preserves an interrupted pre-upgrade slice’s phase, iteration, evidence, and edits while starting fresh conversations when IDs are absent.
- The scope remains minimal and serves the VISION’s inspectable session supervision. The separate message-interpretation slice was not reviewed.