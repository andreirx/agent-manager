# lexmap relatedness labels
repo: /Users/apple/Documents/APLICATII BIJUTERIE/legacy-codebases/leveldb
identity: HEAD 7ee830d, 0 uncommitted entries, inputs sha256:df8e79297d0552b576b2de19ab7fd3b74b059a126823473a7cd70f0c982fd772
seed: 1
median-tokens: 60

How to label: for each candidate, would a reviewer of a change in the query file need to open this file to judge the change — because it defines what the query uses, uses what the query defines, or is the other half of the same feature (schema, contract, consumer, sibling implementation)? Mark [x] yes, [ ] no, [?] cannot tell. Sharing only framework vocabulary, or merely sitting in the same layer, is "no". Open the files; the "shares" list is orientation, not evidence. Add a short reason after "⇒".

## query: db/memtable.h
rare: MemTableBackwardIterator, MemTables, STORAGE_LEVELDB_DB_MEMTABLE_H_, KeyComparator, MemTableIterator, ApproximateMemoryUsage, SkipList, arena_

- [ ] db/db_iter.cc — shares: AppendInternalKey, ValueType, kTypeDeletion, SequenceNumber, yields, deletion ⇒ consumes merged internal keys; never touches MemTable
- [x] db/db_impl.h — shares: MemTable, InternalKeyComparator, SequenceNumber, deletion, friend, once ⇒ declares mem_/imm_ and WriteLevel0Table(MemTable*)
- [ ] db/version_set.cc — shares: refs_, LookupKey, ValueType, comparator_, NotFound, InternalKeyComparator ⇒ includes memtable.h but never uses MemTable
- [x] db/write_batch_test.cc — shares: MemTable, kTypeDeletion, InternalKeyComparator, Ref, Unref, memtable ⇒ test builds a MemTable and reads it back
- [x] db/skiplist.h — shares: SkipList, arena_, Increase, skiplist, Arena, arena ⇒ defines the SkipList behind MemTable::Table
- [x] db/repair.cc — shares: MemTable, InternalKeyComparator, SequenceNumber, Ref, Unref, once ⇒ builds a MemTable, Ref/Unref, NewIterator
- [x] db/dbformat.h — shares: AppendInternalKey, LookupKey, ValueType, MemTable, kTypeDeletion, InternalKeyComparator ⇒ defines InternalKeyComparator, LookupKey, ValueType it uses
- [ ] db/dbformat_test.cc — shares: AppendInternalKey, ValueType, kTypeDeletion, InternalKeyComparator, encoded, seq ⇒ tests key encoding only; no MemTable
- [ ] include/leveldb/env.h — shares: NotFound, exist, safe, once, live, caller ⇒ shared vocabulary only
- [ ] util/cache.cc — shares: table_, reference, Ref, Unref, structure, being ⇒ its own Ref/Unref; unrelated
- [ ] db/version_set.h — shares: refs_, LookupKey, MemTable, InternalKeyComparator, Ref, Unref ⇒ forward-declares MemTable only; never uses it
- [ ] util/arena.cc — shares: Arena, arena ⇒ Arena impl; the type comes from arena.h
- [x] table/table_test.cc — shares: table_, AppendInternalKey, comparator_, MemTable, InternalKeyComparator, Ref ⇒ MemTableConstructor exercises MemTable Add/NewIterator
- [ ] helpers/memenv/memenv.cc — shares: refs_, Private, counted, Increase, reference, initial ⇒ its own refcounting; unrelated
- [ ] db/db_test.cc — shares: NotFound, kTypeDeletion, remains, Drop, exist, deletion ⇒ only TEST_CompactMemTable through DBImpl
- [x] db/db_impl.cc — shares: ApproximateMemoryUsage, LookupKey, ValueType, MemTable, kTypeDeletion, InternalKeyComparator ⇒ main user: creates, Ref/Unref, Add, Get, flushes
- [ ] db/dbformat.cc — shares: AppendInternalKey, LookupKey, ValueType, InternalKeyComparator, SequenceNumber, estimate ⇒ impl of comparator/LookupKey; header is enough
- [ ] db/version_edit.h — shares: comparator_, SequenceNumber, friend, typedef, seq ⇒ shared vocabulary only
- [ ] db/skiplist_test.cc — shares: SkipList, arena_, skiplist, Arena, arena, initial ⇒ tests SkipList itself, not MemTable
- [x] db/write_batch.cc — shares: MemTable, kTypeDeletion, SequenceNumber, seq, memtable, count ⇒ MemTableInserter calls mem_->Add
- [ ] util/testutil.h — shares: references ⇒ unrelated
- [ ] util/env_windows_test_helper.h — shares: friend ⇒ unrelated
- [ ] db/write_batch_internal.h — shares: MemTable, SequenceNumber, seq, memtable, count ⇒ forward-declares MemTable; use is in write_batch.cc
- [x] db/memtable.cc — shares: KeyComparator, MemTableIterator, ApproximateMemoryUsage, arena_, table_, refs_ ⇒ the .cc implementing this header
- [ ] table/filter_block.cc — shares: structure ⇒ unrelated

## query: db/version_edit.cc
rare: CompactPointer, GetInternalKey, GetLevel, LastSeq, NextFile, deleted_file_kvp, deleted_files_kvp, kCompactPointer

- [ ] table/format.cc — shares: GetVarint64, PutVarint64, EncodeTo, DecodeFrom, Corruption, input ⇒ different EncodeTo/DecodeFrom (BlockHandle)
- [x] util/coding.h — shares: GetVarint32, GetVarint64, PutLengthPrefixedSlice, PutVarint64, GetLengthPrefixedSlice, PutVarint32 ⇒ varint/length-prefixed encoders the serializer uses
- [ ] table/table_test.cc — shares: comparator_, kNumLevels, auto, invalid, config, str ⇒ shared vocabulary only
- [ ] util/random.h — shares: numbers ⇒ unrelated
- [ ] db/db_test.cc — shares: kNumLevels, version_set, InternalKey, Encode, auto, invalid ⇒ never touches VersionEdit
- [ ] db/memtable.cc — shares: GetLengthPrefixedSlice, PutVarint32, comparator_, tag, Encode, numbers ⇒ same coding helpers, unrelated
- [ ] include/leveldb/dumpfile.h — shares: storage ⇒ unrelated
- [ ] db/db_impl.h — shares: kNumLevels, VersionEdit, InternalKey, src, config, disk ⇒ forward-declares VersionEdit only
- [ ] db/corruption_test.cc — shares: version_set, file_size, tag, config, compaction, Clear ⇒ unrelated to edit encoding
- [x] db/version_edit.h — shares: compact_pointers_, deleted_files_, has_comparator_, has_last_sequence_, has_log_number_, has_next_file_number_ ⇒ the header this .cc implements
- [x] db/version_set.h — shares: LogNumber, PrevLogNumber, last_sequence_, log_number_, prev_log_number_, next_file_number_ ⇒ directly included; VersionSet is the friend consumer
- [ ] util/coding.cc — shares: GetVarint32, GetVarint64, PutLengthPrefixedSlice, PutVarint64, GetLengthPrefixedSlice, PutVarint32 ⇒ encoder impl; header suffices
- [x] db/repair.cc — shares: next_file_number_, AddFile, version_edit, EncodeTo, FileMetaData, DebugString ⇒ AddFile + EncodeTo to rebuild the manifest
- [ ] db/write_batch.cc — shares: PutLengthPrefixedSlice, GetLengthPrefixedSlice, tag, src, unknown, Clear ⇒ same coding helpers, unrelated
- [ ] db/version_set_test.cc — shares: FileMetaData, version_set, InternalKey, Encode, smallest, largest ⇒ tests FindFile only
- [ ] table/merger.h — shares: deleted ⇒ unrelated
- [x] db/db_impl.cc — shares: LogNumber, PrevLogNumber, AddFile, kNumLevels, EncodeTo, FileMetaData ⇒ writes new-DB edit, Recover fills edits
- [x] db/dumpfile.cc — shares: AppendNumberTo, version_edit, DebugString, VersionEdit, DecodeFrom, file_size ⇒ decodes manifest edits and prints DebugString
- [x] db/version_set.cc — shares: compact_pointers_, deleted_files_, has_comparator_, has_last_sequence_, has_log_number_, has_next_file_number_ ⇒ Builder::Apply reads edit fields; LogAndApply/Recover encode/decode
- [x] db/dbformat.h — shares: kNumLevels, DebugString, DecodeFrom, InternalKey, tag, Encode ⇒ InternalKey Encode/DecodeFrom and config::kNumLevels
- [ ] util/coding_test.cc — shares: PutLengthPrefixedSlice, PutVarint64, GetLengthPrefixedSlice, PutVarint32, input ⇒ tests coding, not edits
- [ ] benchmarks/db_bench_log.cc — shares: AddFile, version_set, VersionEdit, InternalKey, auto ⇒ benchmarks LogAndApply via header API only
- [ ] db/log_format.h — shares: none ⇒ unrelated
- [x] db/version_edit_test.cc — shares: AddFile, version_edit, EncodeTo, VersionEdit, DecodeFrom, InternalKey ⇒ encode/decode round-trip test
- [ ] db/builder.cc — shares: version_edit, FileMetaData, DecodeFrom, file_size, smallest, largest ⇒ fills FileMetaData; never touches VersionEdit
- [ ] db/builder.h — shares: FileMetaData, VersionEdit, file_size ⇒ forward-declares VersionEdit; BuildTable takes FileMetaData only

## query: util/crc32c.cc
rare: AcceleretedCRC32C, CanAccelerateCRC32C, ReadUint32LE, RoundUp, STEP1, STEP16, STEP4, STEP4W

- [x] db/log_reader.cc — shares: DecodeFixed32, crc32c, partial, crc, xff, zero ⇒ verifies record CRCs with Value/Unmask
- [ ] db/filename.cc — shares: tmp ⇒ unrelated
- [ ] table/block.cc — shares: DecodeFixed32, uint8_t, ahead, might, past, already ⇒ unrelated
- [x] benchmarks/db_bench.cc — shares: crc32c, CPU, running, given, crc, least ⇒ crc32c benchmark exercises Extend
- [ ] util/logging.cc — shares: uint8_t, constexpr, xff ⇒ unrelated
- [ ] table/filter_block_test.cc — shares: DecodeFixed32 ⇒ unrelated
- [ ] util/cache_test.cc — shares: uintptr_t, DecodeFixed32, constexpr ⇒ unrelated
- [x] port/port_config.h.in — shares: CRC32C ⇒ HAVE_CRC32C gates the accelerated path probed
- [ ] util/hash.cc — shares: DecodeFixed32, uint8_t, time ⇒ unrelated
- [x] port/port_stdcxx.h — shares: AcceleratedCRC32C, crc32c, uint8_t, Extend, crc, cstddef ⇒ defines port::AcceleratedCRC32C the query calls
- [x] util/crc32c_test.cc — shares: crc32c, uint8_t, Extend, crc, xff ⇒ the unit test
- [x] table/format.cc — shares: DecodeFixed32, crc32c, crc ⇒ verifies block CRCs with Value/Unmask
- [ ] db/db_impl.cc — shares: Advance, ones, template, CPU, few, better ⇒ unrelated
- [ ] db/version_set.cc — shares: far, ones, pre, little, given, possible ⇒ unrelated
- [ ] port/thread_annotations.h — shares: https ⇒ unrelated
- [ ] util/arena.cc — shares: uintptr_t, aligned, power ⇒ unrelated
- [x] util/crc32c.h — shares: crc32c, CRCs, Extend, crc, cstddef, inline ⇒ the header this .cc implements
- [ ] util/status_test.cc — shares: none ⇒ unrelated
- [x] db/log_test.cc — shares: crc32c, partial, crc, past, get ⇒ forges record CRCs with Value/Mask
- [ ] util/coding_test.cc — shares: DecodeFixed32, endian, power, little ⇒ unrelated
- [x] util/coding.h — shares: DecodeFixed32, uint8_t, past, inline, least ⇒ DecodeFixed32 used by ReadUint32LE
- [ ] db/dbformat.h — shares: uint8_t, cstddef, xff, inline, returns ⇒ unrelated
- [x] db/log_writer.cc — shares: crc32c, Extend, crc, xff, zero ⇒ computes record CRCs with Extend/Mask
- [x] port/port_example.h — shares: AcceleratedCRC32C, Extend, crc, zero, already, least ⇒ documents the AcceleratedCRC32C port contract
- [ ] util/env_posix.cc — shares: power, template, constexpr, given, bit, possible ⇒ unrelated
- [ ] .gitmodules — shares: github, google, https, com ⇒ pins the third_party crc32c submodule; not code
- [ ] util/comparator.cc — shares: uint8_t, xff, get ⇒ unrelated
- [ ] db/log_writer.h — shares: crc32c, pre, crc ⇒ declares type_crc_ cache; the crc32c calls are in log_writer.cc

## query: util/env.cc
rare: DoWriteStringToFile, kBufferSize, should_sync, va_start, DeleteDir, DeleteFile, LEVELDB_DELETEFILE_UNDEFINED, NotSupported

- [ ] util/posix_logger.h — shares: va_end, va_list, Logv, cstdarg, did, Logger ⇒ implements Logv; Log() just forwards per env.h
- [ ] util/env_windows_test.cc — shares: RandomAccessFile, above ⇒ unrelated
- [x] util/env_posix_test.cc — shares: WriteStringToFile, FileLock, NewAppendableFile, NewSequentialFile, NewWritableFile, SequentialFile ⇒ calls WriteStringToFile
- [x] helpers/memenv/memenv.cc — shares: va_list, EnvWrapper, RemoveDir, FileLock, NewAppendableFile, NewSequentialFile ⇒ Env impl overriding the defaults defined here
- [ ] db/db_impl.cc — shares: RemoveDir, info_log, FileLock, NewAppendableFile, NewSequentialFile, NewWritableFile ⇒ drives Env via env.h; no helper used
- [x] db/recovery_test.cc — shares: ReadFileToString, NewAppendableFile, NewWritableFile, did, Close, fname ⇒ calls ReadFileToString
- [x] include/leveldb/env.h — shares: DeleteDir, DeleteFile, LEVELDB_DELETEFILE_UNDEFINED, _WIN32, WriteStringToFile, va_list ⇒ the header this .cc implements
- [ ] include/leveldb/iterator.h — shares: none ⇒ unrelated
- [x] util/env_test.cc — shares: ReadFileToString, NewAppendableFile, NewSequentialFile, NewWritableFile, SequentialFile, RandomAccessFile ⇒ tests Env defaults and ReadFileToString
- [ ] db/db_test.cc — shares: EnvWrapper, RemoveDir, NewWritableFile, RandomAccessFile, removed, Log ⇒ EnvWrapper subclasses; interface use only
- [x] helpers/memenv/memenv_test.cc — shares: WriteStringToFile, RemoveDir, FileLock, NewAppendableFile, NewSequentialFile, NewWritableFile ⇒ calls WriteStringToFile
- [x] util/env_windows.cc — shares: RemoveDir, FileLock, NewAppendableFile, NewSequentialFile, NewWritableFile, SequentialFile ⇒ Env impl overriding RemoveFile/RemoveDir/NewAppendableFile
- [ ] db/fault_injection_test.cc — shares: EnvWrapper, NewAppendableFile, NewSequentialFile, NewWritableFile, SequentialFile, auto ⇒ EnvWrapper subclass; interface use only
- [x] db/corruption_test.cc — shares: WriteStringToFile, ReadFileToString, did, fname ⇒ Read/WriteStringToFile to corrupt files
- [x] util/env_posix.cc — shares: RemoveDir, FileLock, NewAppendableFile, NewSequentialFile, NewWritableFile, SequentialFile ⇒ Env impl overriding RemoveFile/RemoveDir/NewAppendableFile
- [ ] util/no_destructor.h — shares: none ⇒ unrelated
- [ ] db/dumpfile.cc — shares: NewSequentialFile, SequentialFile, RandomAccessFile, fname ⇒ Env interface use only
- [ ] util/mutexlock.h — shares: none ⇒ unrelated
- [ ] db/c.cc — shares: info_log, FileLock, SequentialFile, RandomAccessFile, Logger ⇒ Env interface use only
- [ ] db/db_impl.h — shares: info_log, FileLock ⇒ unrelated
- [ ] util/windows_logger.h — shares: va_end, va_list, Logv, cstdarg, did, Logger ⇒ implements Logv; Log() just forwards per env.h
- [ ] db/repair.cc — shares: info_log, NewSequentialFile, NewWritableFile, SequentialFile, Log, Logger ⇒ Env interface use only
- [x] db/version_set.cc — shares: ReadFileToString, info_log, NewAppendableFile, NewSequentialFile, NewWritableFile, SequentialFile ⇒ ReadFileToString reads CURRENT
- [ ] db/snapshot.h — shares: defined ⇒ unrelated
- [ ] util/testutil.h — shares: EnvWrapper, NewAppendableFile, NewWritableFile, fname ⇒ ErrorEnv wrapper; interface use only
- [ ] include/leveldb/export.h — shares: _WIN32, defined ⇒ export macro only; unrelated

## query: util/logging.cc
rare: digits_consumed, kLastDigitOfMaxUint64, kMaxUint64, AppendEscapedStringTo, AppendNumberTo, numeric_limits, ConsumeDecimalNumber, NumberToString

- [ ] db/db_test.cc — shares: NumberToString, EscapeString, away, llu, unsigned, long ⇒ debug messages and property-name concat only
- [ ] util/coding.cc — shares: remove_prefix, uint8_t ⇒ unrelated
- [x] table/filter_block_test.cc — shares: EscapeString ⇒ asserts the exact EscapeString format
- [ ] helpers/memenv/memenv.cc — shares: numeric_limits, limits, max ⇒ unrelated
- [x] util/logging_test.cc — shares: numeric_limits, ConsumeDecimalNumber, NumberToString, limits, max, check ⇒ the unit test
- [ ] db/db_iter.cc — shares: EscapeString, avoid ⇒ debug fprintf only
- [ ] include/leveldb/options.h — shares: none ⇒ unrelated
- [ ] util/env_windows.cc — shares: numeric_limits, max, constexpr, avoid, cstdlib, str ⇒ includes logging.h, never uses it
- [x] db/corruption_test.cc — shares: ConsumeDecimalNumber, NumberToString, num ⇒ ConsumeDecimalNumber parses keys
- [ ] db/log_test.cc — shares: remove_prefix, long ⇒ unrelated
- [ ] db/c.cc — shares: uint8_t, cstdlib, str, val ⇒ unrelated
- [x] db/db_impl.cc — shares: ConsumeDecimalNumber, remove_prefix, llu, unsigned, long, num ⇒ ConsumeDecimalNumber parses property level
- [ ] include/leveldb/db.h — shares: num ⇒ unrelated
- [x] db/dumpfile.cc — shares: AppendEscapedStringTo, AppendNumberTo, val ⇒ output built from AppendNumberTo/AppendEscapedStringTo
- [ ] db/log_reader.cc — shares: remove_prefix, unsigned, xff ⇒ unrelated
- [x] db/filename.cc — shares: ConsumeDecimalNumber, remove_prefix, llu, unsigned, long, num ⇒ ConsumeDecimalNumber parses file numbers
- [ ] db/dbformat.h — shares: uint8_t, avoid, xff, num ⇒ includes logging.h, never uses it
- [ ] db/version_set.cc — shares: AppendNumberTo, avoid, long, num, check ⇒ DebugString only
- [ ] db/repair.cc — shares: EscapeString, llu, max, unsigned, long, also ⇒ log message only
- [ ] util/env_windows_test.cc — shares: limits ⇒ unrelated
- [ ] db/version_edit.cc — shares: AppendNumberTo, str ⇒ DebugString only
- [ ] util/hash.h — shares: none ⇒ unrelated
- [ ] table/table_test.cc — shares: EscapeString, llu, unsigned, long, str, xff ⇒ debug fprintf only
- [x] util/logging.h — shares: AppendEscapedStringTo, AppendNumberTo, ConsumeDecimalNumber, NumberToString, EscapeString, avoid ⇒ the header this .cc implements
- [ ] util/env_posix.cc — shares: numeric_limits, limits, max, constexpr, avoid, cstdlib ⇒ unrelated
- [ ] util/comparator.cc — shares: uint8_t, xff ⇒ includes logging.h, never uses it
- [ ] util/crc32c_test.cc — shares: uint8_t, xff ⇒ unrelated
- [x] db/write_batch_test.cc — shares: NumberToString ⇒ NumberToString builds the asserted expected-state string
- [ ] util/coding.h — shares: uint8_t, str ⇒ unrelated
- [ ] port/port_stdcxx.h — shares: uint8_t, max ⇒ unrelated

## query: util/status.cc
rare: len1, len2, CopyState, kCorruption, kIOError, kInvalidArgument, kNotSupported, kOk

- [ ] db/c.cc — shares: state_, memcpy, tmp ⇒ its own state_; unrelated
- [ ] db/db_test.cc — shares: NotFound, implemented, Not ⇒ Status via public API only
- [ ] db/version_set.cc — shares: kNotFound, NotFound, Not, tmp, Corruption ⇒ Status via public API only
- [ ] db/memtable.cc — shares: NotFound, memcpy ⇒ Status via public API only
- [ ] table/table_test.cc — shares: memcpy, tmp, Corruption ⇒ Status via public API only
- [ ] util/env_posix_test.cc — shares: argument, memcpy ⇒ unrelated
- [ ] db/skiplist_test.cc — shares: state_ ⇒ its own state_; unrelated
- [ ] util/env_windows.cc — shares: NotFound, msg, memcpy ⇒ Status via public API only
- [ ] benchmarks/db_bench.cc — shares: Invalid, msg ⇒ unrelated
- [x] util/status_test.cc — shares: NotFound ⇒ the unit test, asserts ToString
- [ ] issues/issue320_test.cc — shares: none ⇒ unrelated
- [ ] util/logging.cc — shares: none ⇒ unrelated
- [ ] benchmarks/db_bench_sqlite3.cc — shares: Invalid, msg ⇒ unrelated
- [ ] util/coding_test.cc — shares: none ⇒ unrelated
- [ ] util/env_posix.cc — shares: NotFound, argument, msg, memcpy, tmp ⇒ Status via public API only
- [ ] benchmarks/db_bench_tree_db.cc — shares: Invalid, msg ⇒ unrelated
- [ ] util/crc32c_test.cc — shares: none ⇒ unrelated
- [x] include/leveldb/status.h — shares: CopyState, kCorruption, kIOError, kInvalidArgument, kNotSupported, kOk ⇒ the header this .cc implements
- [ ] db/fault_injection_test.cc — shares: state_, tmp ⇒ its own state_; unrelated
- [ ] table/table.cc — shares: Not, Corruption ⇒ Status via public API only
- [ ] include/leveldb/env.h — shares: NotFound ⇒ comment mention only
- [ ] util/env_windows_test_helper.h — shares: none ⇒ unrelated
- [ ] db/log_test.cc — shares: NotFound, msg, Corruption ⇒ matches message substrings, not the prefix
- [ ] db/memtable.h — shares: NotFound ⇒ Status via public API only
- [ ] util/env_test.cc — shares: state_ ⇒ its own state_; unrelated
- [ ] db/version_edit.cc — shares: msg, Corruption ⇒ Status::Corruption via public API only
- [ ] db/recovery_test.cc — shares: NOT_FOUND, tmp ⇒ IsNotFound via public API only
- [ ] db/dbformat.cc — shares: memcpy, tmp ⇒ no Status use at all
