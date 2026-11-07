# lexmap relatedness labels
repo: /Users/apple/Documents/APLICATII BIJUTERIE/legacy-codebases/leveldb
identity: HEAD 7ee830d, 0 uncommitted entries, inputs sha256:df8e79297d0552b576b2de19ab7fd3b74b059a126823473a7cd70f0c982fd772
seed: 1
median-tokens: 60

How to label: for each candidate, would a reviewer of a change in the query file need to open this file to judge the change — because it defines what the query uses, uses what the query defines, or is the other half of the same feature (schema, contract, consumer, sibling implementation)? Mark [x] yes, [ ] no, [?] cannot tell. Sharing only framework vocabulary, or merely sitting in the same layer, is "no". Open the files; the "shares" list is orientation, not evidence. Add a short reason after "⇒".

## query: db/memtable.h
rare: MemTableBackwardIterator, MemTables, STORAGE_LEVELDB_DB_MEMTABLE_H_, KeyComparator, MemTableIterator, ApproximateMemoryUsage, SkipList, arena_

- [ ] db/db_iter.cc — shares: AppendInternalKey, ValueType, kTypeDeletion, SequenceNumber, yields, deletion ⇒
- [ ] db/db_impl.h — shares: MemTable, InternalKeyComparator, SequenceNumber, deletion, friend, once ⇒
- [ ] db/version_set.cc — shares: refs_, LookupKey, ValueType, comparator_, NotFound, InternalKeyComparator ⇒
- [ ] db/write_batch_test.cc — shares: MemTable, kTypeDeletion, InternalKeyComparator, Ref, Unref, memtable ⇒
- [ ] db/skiplist.h — shares: SkipList, arena_, Increase, skiplist, Arena, arena ⇒
- [ ] db/repair.cc — shares: MemTable, InternalKeyComparator, SequenceNumber, Ref, Unref, once ⇒
- [ ] db/dbformat.h — shares: AppendInternalKey, LookupKey, ValueType, MemTable, kTypeDeletion, InternalKeyComparator ⇒
- [ ] db/dbformat_test.cc — shares: AppendInternalKey, ValueType, kTypeDeletion, InternalKeyComparator, encoded, seq ⇒
- [ ] include/leveldb/env.h — shares: NotFound, exist, safe, once, live, caller ⇒
- [ ] util/cache.cc — shares: table_, reference, Ref, Unref, structure, being ⇒
- [ ] db/version_set.h — shares: refs_, LookupKey, MemTable, InternalKeyComparator, Ref, Unref ⇒
- [ ] util/arena.cc — shares: Arena, arena ⇒
- [ ] table/table_test.cc — shares: table_, AppendInternalKey, comparator_, MemTable, InternalKeyComparator, Ref ⇒
- [ ] helpers/memenv/memenv.cc — shares: refs_, Private, counted, Increase, reference, initial ⇒
- [ ] db/db_test.cc — shares: NotFound, kTypeDeletion, remains, Drop, exist, deletion ⇒
- [ ] db/db_impl.cc — shares: ApproximateMemoryUsage, LookupKey, ValueType, MemTable, kTypeDeletion, InternalKeyComparator ⇒
- [ ] db/dbformat.cc — shares: AppendInternalKey, LookupKey, ValueType, InternalKeyComparator, SequenceNumber, estimate ⇒
- [ ] db/version_edit.h — shares: comparator_, SequenceNumber, friend, typedef, seq ⇒
- [ ] db/skiplist_test.cc — shares: SkipList, arena_, skiplist, Arena, arena, initial ⇒
- [ ] db/write_batch.cc — shares: MemTable, kTypeDeletion, SequenceNumber, seq, memtable, count ⇒
- [ ] util/testutil.h — shares: references ⇒
- [ ] util/env_windows_test_helper.h — shares: friend ⇒
- [ ] db/write_batch_internal.h — shares: MemTable, SequenceNumber, seq, memtable, count ⇒
- [ ] db/memtable.cc — shares: KeyComparator, MemTableIterator, ApproximateMemoryUsage, arena_, table_, refs_ ⇒
- [ ] table/filter_block.cc — shares: structure ⇒

## query: db/version_edit.cc
rare: CompactPointer, GetInternalKey, GetLevel, LastSeq, NextFile, deleted_file_kvp, deleted_files_kvp, kCompactPointer

- [ ] table/format.cc — shares: GetVarint64, PutVarint64, EncodeTo, DecodeFrom, Corruption, input ⇒
- [ ] util/coding.h — shares: GetVarint32, GetVarint64, PutLengthPrefixedSlice, PutVarint64, GetLengthPrefixedSlice, PutVarint32 ⇒
- [ ] table/table_test.cc — shares: comparator_, kNumLevels, auto, invalid, config, str ⇒
- [ ] util/random.h — shares: numbers ⇒
- [ ] db/db_test.cc — shares: kNumLevels, version_set, InternalKey, Encode, auto, invalid ⇒
- [ ] db/memtable.cc — shares: GetLengthPrefixedSlice, PutVarint32, comparator_, tag, Encode, numbers ⇒
- [ ] include/leveldb/dumpfile.h — shares: storage ⇒
- [ ] db/db_impl.h — shares: kNumLevels, VersionEdit, InternalKey, src, config, disk ⇒
- [ ] db/corruption_test.cc — shares: version_set, file_size, tag, config, compaction, Clear ⇒
- [ ] db/version_edit.h — shares: compact_pointers_, deleted_files_, has_comparator_, has_last_sequence_, has_log_number_, has_next_file_number_ ⇒
- [ ] db/version_set.h — shares: LogNumber, PrevLogNumber, last_sequence_, log_number_, prev_log_number_, next_file_number_ ⇒
- [ ] util/coding.cc — shares: GetVarint32, GetVarint64, PutLengthPrefixedSlice, PutVarint64, GetLengthPrefixedSlice, PutVarint32 ⇒
- [ ] db/repair.cc — shares: next_file_number_, AddFile, version_edit, EncodeTo, FileMetaData, DebugString ⇒
- [ ] db/write_batch.cc — shares: PutLengthPrefixedSlice, GetLengthPrefixedSlice, tag, src, unknown, Clear ⇒
- [ ] db/version_set_test.cc — shares: FileMetaData, version_set, InternalKey, Encode, smallest, largest ⇒
- [ ] table/merger.h — shares: deleted ⇒
- [ ] db/db_impl.cc — shares: LogNumber, PrevLogNumber, AddFile, kNumLevels, EncodeTo, FileMetaData ⇒
- [ ] db/dumpfile.cc — shares: AppendNumberTo, version_edit, DebugString, VersionEdit, DecodeFrom, file_size ⇒
- [ ] db/version_set.cc — shares: compact_pointers_, deleted_files_, has_comparator_, has_last_sequence_, has_log_number_, has_next_file_number_ ⇒
- [ ] db/dbformat.h — shares: kNumLevels, DebugString, DecodeFrom, InternalKey, tag, Encode ⇒
- [ ] util/coding_test.cc — shares: PutLengthPrefixedSlice, PutVarint64, GetLengthPrefixedSlice, PutVarint32, input ⇒
- [ ] benchmarks/db_bench_log.cc — shares: AddFile, version_set, VersionEdit, InternalKey, auto ⇒
- [ ] db/log_format.h — shares: none ⇒
- [ ] db/version_edit_test.cc — shares: AddFile, version_edit, EncodeTo, VersionEdit, DecodeFrom, InternalKey ⇒
- [ ] db/builder.cc — shares: version_edit, FileMetaData, DecodeFrom, file_size, smallest, largest ⇒

## query: util/crc32c.cc
rare: AcceleretedCRC32C, CanAccelerateCRC32C, ReadUint32LE, RoundUp, STEP1, STEP16, STEP4, STEP4W

- [ ] db/log_reader.cc — shares: DecodeFixed32, crc32c, partial, crc, xff, zero ⇒
- [ ] db/filename.cc — shares: tmp ⇒
- [ ] table/block.cc — shares: DecodeFixed32, uint8_t, ahead, might, past, already ⇒
- [ ] benchmarks/db_bench.cc — shares: crc32c, CPU, running, given, crc, least ⇒
- [ ] util/logging.cc — shares: uint8_t, constexpr, xff ⇒
- [ ] table/filter_block_test.cc — shares: DecodeFixed32 ⇒
- [ ] util/cache_test.cc — shares: uintptr_t, DecodeFixed32, constexpr ⇒
- [ ] port/port_config.h.in — shares: CRC32C ⇒
- [ ] util/hash.cc — shares: DecodeFixed32, uint8_t, time ⇒
- [ ] port/port_stdcxx.h — shares: AcceleratedCRC32C, crc32c, uint8_t, Extend, crc, cstddef ⇒
- [ ] util/crc32c_test.cc — shares: crc32c, uint8_t, Extend, crc, xff ⇒
- [ ] table/format.cc — shares: DecodeFixed32, crc32c, crc ⇒
- [ ] db/db_impl.cc — shares: Advance, ones, template, CPU, few, better ⇒
- [ ] db/version_set.cc — shares: far, ones, pre, little, given, possible ⇒
- [ ] port/thread_annotations.h — shares: https ⇒
- [ ] util/arena.cc — shares: uintptr_t, aligned, power ⇒
- [ ] util/crc32c.h — shares: crc32c, CRCs, Extend, crc, cstddef, inline ⇒
- [ ] util/status_test.cc — shares: none ⇒
- [ ] db/log_test.cc — shares: crc32c, partial, crc, past, get ⇒
- [ ] util/coding_test.cc — shares: DecodeFixed32, endian, power, little ⇒
- [ ] util/coding.h — shares: DecodeFixed32, uint8_t, past, inline, least ⇒
- [ ] db/dbformat.h — shares: uint8_t, cstddef, xff, inline, returns ⇒
- [ ] db/log_writer.cc — shares: crc32c, Extend, crc, xff, zero ⇒
- [ ] port/port_example.h — shares: AcceleratedCRC32C, Extend, crc, zero, already, least ⇒
- [ ] util/env_posix.cc — shares: power, template, constexpr, given, bit, possible ⇒

## query: util/env.cc
rare: DoWriteStringToFile, kBufferSize, should_sync, va_start, DeleteDir, DeleteFile, LEVELDB_DELETEFILE_UNDEFINED, NotSupported

- [ ] util/posix_logger.h — shares: va_end, va_list, Logv, cstdarg, did, Logger ⇒
- [ ] util/env_windows_test.cc — shares: RandomAccessFile, above ⇒
- [ ] util/env_posix_test.cc — shares: WriteStringToFile, FileLock, NewAppendableFile, NewSequentialFile, NewWritableFile, SequentialFile ⇒
- [ ] helpers/memenv/memenv.cc — shares: va_list, EnvWrapper, RemoveDir, FileLock, NewAppendableFile, NewSequentialFile ⇒
- [ ] db/db_impl.cc — shares: RemoveDir, info_log, FileLock, NewAppendableFile, NewSequentialFile, NewWritableFile ⇒
- [ ] db/recovery_test.cc — shares: ReadFileToString, NewAppendableFile, NewWritableFile, did, Close, fname ⇒
- [ ] include/leveldb/env.h — shares: DeleteDir, DeleteFile, LEVELDB_DELETEFILE_UNDEFINED, _WIN32, WriteStringToFile, va_list ⇒
- [ ] include/leveldb/iterator.h — shares: none ⇒
- [ ] util/env_test.cc — shares: ReadFileToString, NewAppendableFile, NewSequentialFile, NewWritableFile, SequentialFile, RandomAccessFile ⇒
- [ ] db/db_test.cc — shares: EnvWrapper, RemoveDir, NewWritableFile, RandomAccessFile, removed, Log ⇒
- [ ] helpers/memenv/memenv_test.cc — shares: WriteStringToFile, RemoveDir, FileLock, NewAppendableFile, NewSequentialFile, NewWritableFile ⇒
- [ ] util/env_windows.cc — shares: RemoveDir, FileLock, NewAppendableFile, NewSequentialFile, NewWritableFile, SequentialFile ⇒
- [ ] db/fault_injection_test.cc — shares: EnvWrapper, NewAppendableFile, NewSequentialFile, NewWritableFile, SequentialFile, auto ⇒
- [ ] db/corruption_test.cc — shares: WriteStringToFile, ReadFileToString, did, fname ⇒
- [ ] util/env_posix.cc — shares: RemoveDir, FileLock, NewAppendableFile, NewSequentialFile, NewWritableFile, SequentialFile ⇒
- [ ] util/no_destructor.h — shares: none ⇒
- [ ] db/dumpfile.cc — shares: NewSequentialFile, SequentialFile, RandomAccessFile, fname ⇒
- [ ] util/mutexlock.h — shares: none ⇒
- [ ] db/c.cc — shares: info_log, FileLock, SequentialFile, RandomAccessFile, Logger ⇒
- [ ] db/db_impl.h — shares: info_log, FileLock ⇒
- [ ] util/windows_logger.h — shares: va_end, va_list, Logv, cstdarg, did, Logger ⇒
- [ ] db/repair.cc — shares: info_log, NewSequentialFile, NewWritableFile, SequentialFile, Log, Logger ⇒
- [ ] db/version_set.cc — shares: ReadFileToString, info_log, NewAppendableFile, NewSequentialFile, NewWritableFile, SequentialFile ⇒
- [ ] db/snapshot.h — shares: defined ⇒
- [ ] util/testutil.h — shares: EnvWrapper, NewAppendableFile, NewWritableFile, fname ⇒

## query: util/logging.cc
rare: digits_consumed, kLastDigitOfMaxUint64, kMaxUint64, AppendEscapedStringTo, AppendNumberTo, numeric_limits, ConsumeDecimalNumber, NumberToString

- [ ] db/db_test.cc — shares: NumberToString, EscapeString, away, llu, unsigned, long ⇒
- [ ] util/coding.cc — shares: remove_prefix, uint8_t ⇒
- [ ] table/filter_block_test.cc — shares: EscapeString ⇒
- [ ] helpers/memenv/memenv.cc — shares: numeric_limits, limits, max ⇒
- [ ] util/logging_test.cc — shares: numeric_limits, ConsumeDecimalNumber, NumberToString, limits, max, check ⇒
- [ ] db/db_iter.cc — shares: EscapeString, avoid ⇒
- [ ] include/leveldb/options.h — shares: none ⇒
- [ ] util/env_windows.cc — shares: numeric_limits, max, constexpr, avoid, cstdlib, str ⇒
- [ ] db/corruption_test.cc — shares: ConsumeDecimalNumber, NumberToString, num ⇒
- [ ] db/log_test.cc — shares: remove_prefix, long ⇒
- [ ] db/c.cc — shares: uint8_t, cstdlib, str, val ⇒
- [ ] db/db_impl.cc — shares: ConsumeDecimalNumber, remove_prefix, llu, unsigned, long, num ⇒
- [ ] include/leveldb/db.h — shares: num ⇒
- [ ] db/dumpfile.cc — shares: AppendEscapedStringTo, AppendNumberTo, val ⇒
- [ ] db/log_reader.cc — shares: remove_prefix, unsigned, xff ⇒
- [ ] db/filename.cc — shares: ConsumeDecimalNumber, remove_prefix, llu, unsigned, long, num ⇒
- [ ] db/dbformat.h — shares: uint8_t, avoid, xff, num ⇒
- [ ] db/version_set.cc — shares: AppendNumberTo, avoid, long, num, check ⇒
- [ ] db/repair.cc — shares: EscapeString, llu, max, unsigned, long, also ⇒
- [ ] util/env_windows_test.cc — shares: limits ⇒
- [ ] db/version_edit.cc — shares: AppendNumberTo, str ⇒
- [ ] util/hash.h — shares: none ⇒
- [ ] table/table_test.cc — shares: EscapeString, llu, unsigned, long, str, xff ⇒
- [ ] util/logging.h — shares: AppendEscapedStringTo, AppendNumberTo, ConsumeDecimalNumber, NumberToString, EscapeString, avoid ⇒
- [ ] util/env_posix.cc — shares: numeric_limits, limits, max, constexpr, avoid, cstdlib ⇒

## query: util/status.cc
rare: len1, len2, CopyState, kCorruption, kIOError, kInvalidArgument, kNotSupported, kOk

- [ ] db/c.cc — shares: state_, memcpy, tmp ⇒
- [ ] db/db_test.cc — shares: NotFound, implemented, Not ⇒
- [ ] db/version_set.cc — shares: kNotFound, NotFound, Not, tmp, Corruption ⇒
- [ ] db/memtable.cc — shares: NotFound, memcpy ⇒
- [ ] table/table_test.cc — shares: memcpy, tmp, Corruption ⇒
- [ ] util/env_posix_test.cc — shares: argument, memcpy ⇒
- [ ] db/skiplist_test.cc — shares: state_ ⇒
- [ ] util/env_windows.cc — shares: NotFound, msg, memcpy ⇒
- [ ] benchmarks/db_bench.cc — shares: Invalid, msg ⇒
- [ ] util/status_test.cc — shares: NotFound ⇒
- [ ] issues/issue320_test.cc — shares: none ⇒
- [ ] util/logging.cc — shares: none ⇒
- [ ] benchmarks/db_bench_sqlite3.cc — shares: Invalid, msg ⇒
- [ ] util/coding_test.cc — shares: none ⇒
- [ ] util/env_posix.cc — shares: NotFound, argument, msg, memcpy, tmp ⇒
- [ ] benchmarks/db_bench_tree_db.cc — shares: Invalid, msg ⇒
- [ ] util/crc32c_test.cc — shares: none ⇒
- [ ] include/leveldb/status.h — shares: CopyState, kCorruption, kIOError, kInvalidArgument, kNotSupported, kOk ⇒
- [ ] db/fault_injection_test.cc — shares: state_, tmp ⇒
- [ ] table/table.cc — shares: Not, Corruption ⇒
- [ ] include/leveldb/env.h — shares: NotFound ⇒
- [ ] util/env_windows_test_helper.h — shares: none ⇒
- [ ] db/log_test.cc — shares: NotFound, msg, Corruption ⇒
- [ ] db/memtable.h — shares: NotFound ⇒
- [ ] util/env_test.cc — shares: state_ ⇒
