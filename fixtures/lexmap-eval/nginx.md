# lexmap relatedness labels
repo: /Users/apple/Documents/APLICATII BIJUTERIE/legacy-codebases/nginx
identity: HEAD b0a4d0f, 3 uncommitted entries, inputs sha256:8f2ac797e1f52dbdee74da4d0180ee38420be5399ff38ec6d760fa959b746c2d
seed: 1
median-tokens: 60

How to label: for each candidate, would a reviewer of a change in the query file need to open this file to judge the change — because it defines what the query uses, uses what the query defines, or is the other half of the same feature (schema, contract, consumer, sibling implementation)? Mark [x] yes, [ ] no, [?] cannot tell. Sharing only framework vocabulary, or merely sitting in the same layer, is "no". Open the files; the "shares" list is orientation, not evidence. Add a short reason after "⇒".

## query: src/core/ngx_output_chain.c
rare: ngx_output_chain_add_copy, ngx_output_chain_align_file_buf, ngx_output_chain_as_is, ngx_output_chain_copy_buf, ngx_output_chain_get_buf, NGX_HAVE_ALIGNED_DIRECTIO, NGX_NONE, NGX_SENDFILE_LIMIT

- [ ] src/http/modules/ngx_http_mp4_module.c — shares: ngx_directio_on_n, ngx_directio_on, ngx_read_file_n, ngx_read_file, last_in_chain, ngx_calloc_buf ⇒ calls directio/read_file itself; no output chain use
- [x] src/http/ngx_http_copy_filter_module.c — shares: aio_handler, need_in_memory, need_in_temp, ngx_output_chain_ctx_t, ngx_output_chain, thread_ctx ⇒ main caller; installs the aio/thread handlers on the ctx
- [x] src/os/win32/ngx_files.h — shares: ngx_directio_off_n, ngx_directio_off, ngx_directio_on_n, ngx_directio_on, ngx_read_file_n, ngx_read_file ⇒ win32 declarations of read_file/directio the copy loop calls
- [x] src/http/modules/ngx_http_proxy_module.c — shares: ngx_chain_writer, filter_ctx, output_filter, ngx_buf_in_memory, ngx_buf_size, ngx_chain_update_chains ⇒ calls ngx_chain_writer defined here
- [ ] src/os/unix/ngx_thread_cond.c — shares: none ⇒ unrelated thread primitive
- [x] src/event/ngx_event_openssl.c — shares: SF_NOCACHE, NGX_HAVE_SENDFILE_NODISKIO, ngx_posted_next_events, ngx_read_file_n, send_chain, ngx_buf_special ⇒ SSL sendfile honours SF_NOCACHE the as_is predicate relies on
- [x] src/http/modules/ngx_http_grpc_module.c — shares: ngx_chain_writer, filter_ctx, output_filter, ngx_buf_special, ngx_chain_update_chains, ngx_free_chain ⇒ calls ngx_chain_writer defined here
- [ ] src/http/modules/ngx_http_ssi_filter_module.c — shares: last_out, ngx_buf_in_memory, ngx_debug_point, ngx_buf_size, ngx_free_chain, ngx_calloc_buf ⇒ buffer macros only; no output chain contact
- [ ] src/http/modules/ngx_http_range_filter_module.c — shares: ngx_buf_in_memory, ngx_buf_size, ngx_buf_special, ngx_free_chain, last_in_chain, ngx_calloc_buf ⇒ buffer macros only
- [ ] src/http/v2/ngx_http_v2_filter_module.c — shares: last_out, ngx_buf_in_memory, send_chain, ngx_buf_size, NGX_CHAIN_ERROR, ngx_free_chain ⇒ buffer/chain macros only
- [ ] src/http/modules/ngx_http_memcached_module.c — shares: num ⇒ nothing shared beyond a field name
- [ ] src/event/ngx_event_pipe.c — shares: thread_ctx, thread_task, output_filter, thread_handler, last_out, ngx_chain_update_chains ⇒ parallel thread-read user of temp files; no interaction
- [x] src/http/ngx_http_upstream.c — shares: ngx_output_chain, ngx_chain_writer, thread_ctx, filter_ctx, output_filter, thread_handler ⇒ drives ngx_output_chain and ngx_chain_writer for request bodies
- [ ] src/stream/ngx_stream_write_filter_module.c — shares: ngx_debug_point, send_chain, ngx_buf_size, ngx_buf_special, NGX_CHAIN_ERROR, ngx_free_chain ⇒ chain macros only
- [x] src/core/ngx_buf.h — shares: aio_handler, need_in_memory, need_in_temp, ngx_chain_writer_ctx_t, ngx_output_chain_ctx_t, ngx_output_chain ⇒ declares the ctx structs and both entry points
- [ ] src/http/modules/ngx_http_sub_filter_module.c — shares: last_out, ngx_buf_in_memory, ngx_debug_point, ngx_buf_size, ngx_free_chain, last_in_chain ⇒ buffer macros only
- [x] src/os/unix/ngx_files.h — shares: ngx_directio_off_n, ngx_thread_read, ngx_directio_off, ngx_directio_on_n, ngx_file_aio_read, ngx_directio_on ⇒ declares read_file/aio_read/thread_read/directio used here
- [ ] src/http/ngx_http_file_cache.c — shares: ngx_thread_read, ngx_file_aio_read, thread_ctx, thread_task, ngx_read_file_n, thread_handler ⇒ independent user of the same file-read API
- [ ] src/event/quic/ngx_event_quic_bpf.c — shares: enabled ⇒ nothing shared
- [ ] src/core/ngx_thread_pool.h — shares: none ⇒ task type reaches here only via ngx_buf.h
- [ ] src/event/ngx_event_udp.h — shares: none ⇒ nothing shared
- [x] src/http/modules/ngx_http_proxy_v2_module.c — shares: ngx_chain_writer, filter_ctx, output_filter, ngx_buf_special, ngx_chain_update_chains, ngx_free_chain ⇒ calls ngx_chain_writer defined here
- [x] src/os/unix/ngx_files.c — shares: ngx_thread_read, ngx_directio_off, ngx_directio_on, thread_task, thread_handler, NGX_HAVE_FILE_AIO ⇒ implements read_file/thread_read/directio the copy loop calls
- [x] src/http/modules/ngx_http_fastcgi_module.c — shares: ngx_chain_writer, filter_ctx, output_filter, ngx_buf_special, ngx_chain_update_chains, last_in_chain ⇒ calls ngx_chain_writer defined here
- [ ] src/http/ngx_http_write_filter_module.c — shares: ngx_posted_next_events, ngx_debug_point, send_chain, ngx_buf_size, ngx_buf_special, NGX_CHAIN_ERROR ⇒ later filter; not called from here
- [x] src/core/ngx_buf.c — shares: ngx_buf_in_memory, ngx_buf_size, ngx_buf_special, ngx_chain_update_chains, ngx_free_chain, ngx_calloc_buf ⇒ implements ngx_chain_update_chains the busy/free recycling relies on
- [ ] src/os/unix/ngx_writev_chain.c — shares: ngx_buf_in_memory, ngx_debug_point, ngx_buf_special, NGX_CHAIN_ERROR, file_last, recycled ⇒ a send_chain backend; not called from here
- [ ] src/event/ngx_event_pipe.h — shares: thread_ctx, thread_task, output_filter, thread_handler, NGX_THREADS, incoming ⇒ parallel pipe ctx with same field names; no interaction

## query: src/core/ngx_rbtree.c
rare: ngx_rbtree_left_rotate, ngx_rbtree_right_rotate, ngx_rbt_black, ngx_rbt_copy_color, ngx_rbt_is_black, ngx_rbt_is_red, ngx_rbtree_insert_timer_value, ngx_rbtree_insert_value

- [ ] src/event/ngx_event_openssl_stapling.c — shares: ngx_rbtree_next, ngx_rbtree_min, ngx_rbtree_delete, ngx_rbtree_insert, ngx_rbtree_t, minutes ⇒ generic caller via ngx_str_rbtree_insert_value
- [x] src/core/ngx_rbtree.h — shares: ngx_rbt_black, ngx_rbt_copy_color, ngx_rbt_is_black, ngx_rbt_is_red, ngx_rbtree_insert_timer_value, ngx_rbtree_insert_value ⇒ the header this .c implements
- [x] src/event/ngx_event_timer.c — shares: ngx_rbtree_insert_timer_value, ngx_rbtree_next, ngx_rbtree_min, ngx_rbtree_delete, ngx_rbtree_t ⇒ binds ngx_rbtree_insert_timer_value defined here
- [x] src/http/modules/ngx_http_limit_conn_module.c — shares: ngx_rbt_red, ngx_rbtree_delete, ngx_rbtree_insert, ngx_rbtree_t ⇒ own insert callback mirrors ngx_rbtree_insert_value
- [ ] src/os/unix/ngx_files.c — shares: none ⇒ nothing shared
- [x] src/event/ngx_event_openssl_cache.c — shares: ngx_rbtree_next, ngx_rbtree_min, ngx_rbt_red, ngx_rbtree_delete, ngx_rbtree_insert, ngx_rbtree_t ⇒ own insert callback mirrors insert_value
- [x] src/event/ngx_event_openssl.c — shares: ngx_rbtree_insert_value, ngx_rbt_red, ngx_rbtree_delete, ngx_rbtree_insert, described, days ⇒ binds insert_value and writes its own callback
- [x] src/event/ngx_event_udp.c — shares: ngx_rbt_red, ngx_rbtree_delete, ngx_rbtree_insert ⇒ own insert callback mirrors insert_value
- [ ] src/http/ngx_http_huff_decode.c — shares: bits ⇒ nothing shared
- [x] src/event/quic/ngx_event_quic_streams.c — shares: ngx_rbtree_next, ngx_rbtree_min, ngx_rbt_red, ngx_rbtree_delete, ngx_rbtree_insert, ngx_rbtree_t ⇒ own insert callback mirrors insert_value
- [ ] src/stream/ngx_stream_geo_module.c — shares: ngx_rbtree_insert, ngx_rbtree_t, insert, binary, bits, tree ⇒ generic caller via ngx_str_rbtree_insert_value
- [x] src/http/ngx_http_file_cache.c — shares: ngx_rbt_red, ngx_rbtree_delete, ngx_rbtree_insert, tree, delete ⇒ own insert callback mirrors insert_value
- [ ] src/http/modules/ngx_http_charset_filter_module.c — shares: none ⇒ nothing shared
- [x] src/http/modules/ngx_http_limit_req_module.c — shares: ngx_rbt_red, ngx_rbtree_delete, ngx_rbtree_insert, ngx_rbtree_t, account ⇒ own insert callback mirrors insert_value
- [x] src/core/ngx_open_file_cache.c — shares: ngx_rbt_red, ngx_rbtree_delete, ngx_rbtree_insert, delete ⇒ own insert callback mirrors insert_value
- [ ] src/event/quic/ngx_event_quic_socket.c — shares: ngx_rbtree_delete, ngx_rbtree_insert ⇒ plain insert/delete caller
- [x] src/core/ngx_string.c — shares: ngx_rbt_red, ngx_rbtree_t ⇒ ngx_str_rbtree_insert_value is a sibling of insert_value
- [ ] src/event/ngx_event_timer.h — shares: ngx_rbtree_delete, ngx_rbtree_insert, ngx_rbtree_t, milliseconds ⇒ thin inline wrappers; plain caller
- [ ] src/os/win32/ngx_alloc.c — shares: none ⇒ nothing shared
- [ ] src/os/unix/ngx_time.h — shares: ngx_rbtree_key_int_t ⇒ only aliases the key typedef
- [x] src/http/modules/ngx_http_upstream_sticky_module.c — shares: ngx_rbtree_insert_timer_value, ngx_rbtree_next, ngx_rbtree_min, ngx_rbt_red, ngx_rbtree_delete, ngx_rbtree_insert ⇒ own insert callback mirrors insert_value
- [x] src/stream/ngx_stream_limit_conn_module.c — shares: ngx_rbt_red, ngx_rbtree_delete, ngx_rbtree_insert, ngx_rbtree_t ⇒ own insert callback mirrors insert_value
- [ ] src/core/ngx_connection.h — shares: ngx_rbtree_t ⇒ holds an ngx_rbtree_t field only
- [x] src/core/ngx_resolver.c — shares: ngx_rbtree_insert_value, ngx_rbtree_min, ngx_rbt_red, ngx_rbtree_delete, ngx_rbtree_insert, ngx_rbtree_t ⇒ own insert callback; binds insert_value too
- [ ] src/http/modules/ngx_http_geo_module.c — shares: ngx_rbtree_insert, ngx_rbtree_t, insert, binary, bits, tree ⇒ generic caller via ngx_str_rbtree_insert_value

## query: src/http/modules/ngx_http_gzip_static_module.c
rare: NGX_HTTP_GZIP_STATIC_ALWAYS, NGX_HTTP_GZIP_STATIC_OFF, NGX_HTTP_GZIP_STATIC_ON, ngx_http_gzip_static, ngx_http_gzip_static_commands, ngx_http_gzip_static_conf_t, ngx_http_gzip_static_create_conf, ngx_http_gzip_static_handler

- [x] src/http/ngx_http_request.h — shares: root_tested, content_encoding, error_page, gzip_vary, NGX_HTTP_NOT_FOUND, allow_ranges ⇒ defines the headers_out fields the handler sets
- [ ] src/http/modules/ngx_http_flv_module.c — shares: NGX_EMLINK, ngx_http_set_etag, root_tested, is_directio, is_file, ngx_http_set_content_type ⇒ separate content handler; same open-file idiom only
- [ ] src/os/win32/ngx_alloc.h — shares: none ⇒ nothing shared
- [ ] src/http/modules/ngx_http_autoindex_module.c — shares: NGX_HTTP_CONTENT_PHASE, NGX_ELOOP, NGX_EACCES, NGX_ENAMETOOLONG, ngx_http_discard_request_body, NGX_HTTP_NOT_FOUND ⇒ separate content-phase handler; no interaction
- [ ] src/http/modules/perl/nginx.xs — shares: is_directio, ngx_http_set_content_type, content_encoding, ngx_http_set_disable_symlinks, ngx_http_discard_request_body, allow_ranges ⇒ shares request fields only
- [ ] src/os/unix/ngx_gcc_atomic_amd64.h — shares: none ⇒ nothing shared
- [ ] src/http/modules/ngx_http_mp4_module.c — shares: NGX_EMLINK, ngx_http_set_etag, root_tested, is_directio, is_file, ngx_http_set_content_type ⇒ separate content handler; same idiom only
- [x] src/core/ngx_open_file_cache.c — shares: is_directio, is_file, is_dir, NGX_ELOOP, ngx_open_cached_file, NGX_HAVE_OPENAT ⇒ implements ngx_open_cached_file the handler calls
- [x] src/http/modules/ngx_http_static_module.c — shares: NGX_EMLINK, ngx_http_set_etag, root_tested, is_directio, is_file, NGX_HTTP_CONTENT_PHASE ⇒ the twin handler gzip_static declines to
- [ ] src/http/modules/ngx_http_dav_module.c — shares: NGX_HTTP_CONTENT_PHASE, NGX_EACCES, NGX_ENAMETOOLONG, NGX_HTTP_NOT_FOUND, NGX_ENOTDIR, ngx_http_send_header ⇒ separate content handler
- [ ] src/http/modules/ngx_http_random_index_module.c — shares: NGX_HTTP_CONTENT_PHASE, NGX_EACCES, NGX_ENAMETOOLONG, NGX_HTTP_NOT_FOUND, NGX_ENOTDIR, ngx_http_map_uri_to_path ⇒ separate content-phase handler
- [ ] src/http/ngx_http.h — shares: ngx_http_discard_request_body, ngx_http_send_header ⇒ umbrella header; core API vocabulary
- [ ] src/os/win32/ngx_win32_init.c — shares: none ⇒ nothing shared
- [ ] src/http/ngx_http_file_cache.c — shares: ngx_open_cached_file, open_file_cache_events, NGX_ENOTDIR, ngx_http_output_filter, ngx_http_send_header, min_uses ⇒ independent open_file_cache user
- [ ] src/http/ngx_http_script.c — shares: is_file, is_dir, ngx_http_set_disable_symlinks, NGX_ENAMETOOLONG, ngx_open_cached_file, open_file_cache_errors ⇒ independent open_file_cache user
- [ ] src/http/modules/ngx_http_log_module.c — shares: root_tested, is_dir, ngx_http_set_disable_symlinks, ngx_open_cached_file, open_file_cache_errors, open_file_cache_events ⇒ independent open_file_cache user
- [ ] contrib/vim/syntax/nginx.vim — shares: gzip_static, error_page, gzip_vary, open_file_cache_errors, open_file_cache_events, open_file_cache ⇒ syntax list; touched only on a directive rename
- [ ] src/http/ngx_http_special_response.c — shares: error_page, ngx_http_discard_request_body, ngx_http_output_filter, ngx_http_send_header, last_modified_time, NGX_HTTP_GET ⇒ error page path; no interaction
- [ ] src/http/modules/ngx_http_try_files_module.c — shares: is_dir, ngx_http_set_disable_symlinks, NGX_ENAMETOOLONG, ngx_open_cached_file, open_file_cache_errors, open_file_cache_events ⇒ independent open_file_cache user
- [ ] src/http/modules/ngx_http_index_module.c — shares: NGX_EMLINK, NGX_HTTP_CONTENT_PHASE, is_dir, NGX_ELOOP, ngx_http_set_disable_symlinks, NGX_EACCES ⇒ separate content-phase handler
- [ ] src/http/ngx_http_upstream.c — shares: content_encoding, NGX_HTTP_NOT_FOUND, allow_ranges, ngx_http_output_filter, ngx_http_send_header, min_uses ⇒ shares header field names only
- [x] src/http/ngx_http_core_module.h — shares: ngx_http_gzip_ok, ngx_http_set_etag, NGX_HTTP_CONTENT_PHASE, ngx_http_set_content_type, error_page, gzip_vary ⇒ clcf fields and gzip_ok/set_etag declarations
- [x] src/http/ngx_http_core_module.c — shares: ngx_http_gzip_ok, ngx_http_set_etag, ngx_http_set_content_type, error_page, gzip_vary, ngx_http_set_disable_symlinks ⇒ implements gzip_ok, set_etag, map_uri_to_path
- [ ] src/event/modules/ngx_poll_module.c — shares: none ⇒ nothing shared
- [x] src/core/ngx_open_file_cache.h — shares: is_directio, is_file, is_dir, ngx_open_cached_file, NGX_HAVE_OPENAT, min_uses ⇒ defines ngx_open_file_info_t the handler fills

## query: src/http/modules/ngx_http_map_module.c
rare: ngx_http_map, ngx_http_map_block, ngx_http_map_cmp_dns_wildcards, ngx_http_map_commands, ngx_http_map_conf_ctx_t, ngx_http_map_conf_t, ngx_http_map_create_conf, ngx_http_map_ctx_t

- [ ] src/http/modules/ngx_http_geo_module.c — shares: ngx_conf_include, default_value, NGX_DEFAULT_POOL_SIZE, handler_conf, ngx_http_variable_null_value, NGX_HTTP_VAR_CHANGEABLE ⇒ similar variable module; no interaction
- [ ] src/http/ngx_http_core_module.c — shares: ngx_http_regex_compile, ngx_conf_include, NGX_REGEX_CASELESS, handler_conf, NGX_MAX_CONF_ERRSTR, ngx_hash_key_lc ⇒ generic conf/hash vocabulary
- [ ] src/http/modules/ngx_http_rewrite_module.c — shares: ngx_http_regex_compile, NGX_REGEX_CASELESS, ngx_http_variable_null_value, NGX_HTTP_VAR_CHANGEABLE, NGX_MAX_CONF_ERRSTR, ngx_regex_compile_t ⇒ regex vocabulary only
- [x] src/http/ngx_http_variables.c — shares: ngx_http_map_find, ngx_http_map_regex_t, ngx_http_map_t, ngx_http_regex_compile, ngx_hash_keys_array_init, ngx_hash_add_key ⇒ implements ngx_http_map_find and ngx_http_regex_compile
- [x] src/http/ngx_http_variables.h — shares: ngx_http_map_find, ngx_http_map_regex_t, ngx_http_map_t, ngx_http_regex_compile, ngx_http_variable_null_value, NGX_HTTP_VAR_CHANGEABLE ⇒ defines ngx_http_map_t / ngx_http_map_regex_t
- [ ] src/stream/ngx_stream_core_module.c — shares: NGX_REGEX_CASELESS, NGX_MAX_CONF_ERRSTR, ngx_pstrdup, ngx_regex_compile_t, NGX_CONF_BLOCK, ngx_align ⇒ conf vocabulary only
- [ ] src/os/unix/ngx_user.c — shares: none ⇒ nothing shared
- [ ] src/os/unix/ngx_setproctitle.c — shares: none ⇒ nothing shared
- [ ] src/stream/ngx_stream_geo_module.c — shares: ngx_conf_include, default_value, NGX_DEFAULT_POOL_SIZE, handler_conf, ngx_pstrdup, NGX_CONF_BLOCK ⇒ similar module in another subsystem
- [x] src/core/ngx_hash.c — shares: NGX_HASH_WILDCARD_KEY, dns_wc_head, dns_wc_tail, ngx_hash_wildcard_init, ngx_hash_wildcard_t, wc_head ⇒ implements hash_keys/wildcard init the block builds with
- [ ] src/http/ngx_http_upstream.c — shares: NGX_HTTP_VAR_NOCACHEABLE, ngx_hash_key_lc, ngx_hash_key_t, bucket_size, ngx_hash_init, ngx_hash_init_t ⇒ hash vocabulary only
- [ ] src/stream/ngx_stream_variables.c — shares: ngx_hash_keys_array_init, ngx_hash_add_key, ngx_hash_keys_arrays_t, ngx_regex_compile_t, ngx_hash_key_t, bucket_size ⇒ stream-side twin helper, not used here
- [ ] src/misc/ngx_cpp_test_module.cpp — shares: none ⇒ nothing shared
- [ ] src/http/modules/ngx_http_proxy_module.c — shares: ngx_http_regex_compile, NGX_REGEX_CASELESS, NGX_HTTP_VAR_CHANGEABLE, NGX_HTTP_VAR_NOCACHEABLE, NGX_MAX_CONF_ERRSTR, ngx_hash_key_lc ⇒ conf/regex vocabulary only
- [x] src/stream/ngx_stream_map_module.c — shares: hash_bucket_size, hash_max_size, map_hash, values_hash, map_hash_bucket_size, map_hash_max_size ⇒ the stream counterpart to mirror
- [ ] src/http/ngx_http.c — shares: NGX_HASH_LARGE, NGX_HASH_WILDCARD_KEY, dns_wc_head, dns_wc_tail, ngx_dns_strcmp, ngx_hash_wildcard_init ⇒ independent wildcard-hash user
- [ ] src/http/modules/ngx_http_fastcgi_module.c — shares: NGX_HTTP_VAR_NOCACHEABLE, NGX_MAX_CONF_ERRSTR, ngx_hash_key_lc, NGX_HTTP_MAIN_CONF_OFFSET, ngx_regex_compile_t, ngx_hash_key_t ⇒ vocabulary only
- [ ] src/http/modules/ngx_http_auth_basic_module.c — shares: ngx_http_compile_complex_value, ngx_http_compile_complex_value_t, ngx_http_complex_value ⇒ complex value vocabulary only
- [ ] src/stream/ngx_stream.c — shares: NGX_HASH_LARGE, NGX_HASH_WILDCARD_KEY, dns_wc_head, dns_wc_tail, ngx_dns_strcmp, ngx_hash_wildcard_init ⇒ independent wildcard-hash user
- [ ] src/http/modules/ngx_http_uwsgi_module.c — shares: ngx_hash_key_lc, NGX_HTTP_MAIN_CONF_OFFSET, ngx_hash_key_t, bucket_size, ngx_hash, ngx_hash_init ⇒ vocabulary only
- [ ] src/http/modules/ngx_http_scgi_module.c — shares: ngx_hash_key_lc, NGX_HTTP_MAIN_CONF_OFFSET, ngx_hash_key_t, bucket_size, ngx_hash, ngx_hash_init ⇒ vocabulary only
- [ ] src/http/ngx_http_core_module.h — shares: ngx_hash_wildcard_t, wc_head, wc_tail, ngx_hash_keys_arrays_t, NGX_PCRE, nregex ⇒ hash types reach here via ngx_hash.h
- [ ] src/http/modules/ngx_http_referer_module.c — shares: NGX_HASH_WILDCARD_KEY, dns_wc_head, dns_wc_tail, ngx_dns_strcmp, ngx_hash_wildcard_init, NGX_REGEX_CASELESS ⇒ independent wildcard-hash user
- [x] src/core/ngx_hash.h — shares: NGX_HASH_LARGE, NGX_HASH_WILDCARD_KEY, dns_wc_head, dns_wc_tail, ngx_hash_wildcard_init, ngx_hash_wildcard_t ⇒ defines keys arrays, wildcard hash, init structs
- [ ] src/http/modules/ngx_http_ssi_filter_module.c — shares: ngx_hash_keys_array_init, ngx_hash_add_key, NGX_HTTP_VAR_NOCACHEABLE, NGX_MAX_CONF_ERRSTR, ngx_regex_compile_t, bucket_size ⇒ vocabulary only
- [ ] src/http/modules/ngx_http_split_clients_module.c — shares: handler_conf, ngx_http_variable_null_value, NGX_HTTP_VAR_CHANGEABLE, NGX_HTTP_MAIN_CONF_OFFSET, NGX_CONF_BLOCK, ngx_conf_parse ⇒ similar variable module; no interaction

## query: src/mail/ngx_mail_smtp_module.c
rare: auth_enabled, ngx_mail_smtp_auth_methods, ngx_mail_smtp_auth_methods_names, ngx_mail_smtp_commands, ngx_mail_smtp_create_srv_conf, ngx_mail_smtp_merge_srv_conf, ngx_mail_smtp_module_ctx, ngx_mail_smtp_protocol

- [x] src/mail/ngx_mail_handler.c — shares: NGX_MAIL_MODULE, ngx_mail_core_srv_conf_t, ngx_mail_core_module, MD5, md5, ngx_mail ⇒ core dispatching cscf->protocol->init_session etc.
- [ ] src/core/ngx_connection.c — shares: none ⇒ nothing shared
- [ ] src/mail/ngx_mail_imap_handler.c — shares: client_buffer_size, NGX_MAIL_AUTH_CRAM_MD5_ENABLED, NGX_MAIL_AUTH_EXTERNAL_ENABLED, auth_methods, starttls_capability, starttls_only_capability ⇒ sibling of smtp_handler, not of this module
- [ ] src/http/modules/ngx_http_limit_conn_module.c — shares: none ⇒ nothing shared
- [ ] src/http/modules/ngx_http_grpc_module.c — shares: NGX_CONF_BITMASK_SET, ngx_conf_merge_bitmask_value, ngx_conf_merge_msec_value, ngx_conf_set_bitmask_slot, ngx_conf_bitmask_t, ngx_conf_merge_size_value ⇒ conf merge macros only
- [ ] src/http/modules/ngx_http_degradation_module.c — shares: none ⇒ nothing shared
- [ ] src/core/ngx_conf_file.h — shares: NGX_CONF_BITMASK_SET, ngx_conf_merge_bitmask_value, ngx_conf_merge_msec_value, ngx_conf_set_bitmask_slot, ngx_conf_bitmask_t, ngx_conf_merge_size_value ⇒ generic conf merge macros
- [x] src/mail/ngx_mail_smtp_module.h — shares: greeting_delay, ngx_mail_smtp_auth_state, ngx_mail_smtp_init_protocol, ngx_mail_smtp_init_session, ngx_mail_smtp_parse_command, ngx_mail_smtp_srv_conf_t ⇒ the header this module implements
- [ ] src/mail/ngx_mail_proxy_module.c — shares: NGX_MAIL_SMTP_PROTOCOL, smtp_auth, NGX_MAIL_SRV_CONF, NGX_MAIL_SRV_CONF_OFFSET, NGX_MAIL_MAIN_CONF, ngx_mail_module_t ⇒ handles the SMTP protocol; never reads this conf
- [ ] src/mail/ngx_mail_pop3_handler.c — shares: NGX_MAIL_AUTH_CRAM_MD5_ENABLED, NGX_MAIL_AUTH_EXTERNAL_ENABLED, auth_methods, starttls_capability, starttls_only_capability, ngx_mail_core_srv_conf_t ⇒ sibling of smtp_handler, not of this module
- [ ] src/http/modules/ngx_http_fastcgi_module.c — shares: NGX_CONF_BITMASK_SET, ngx_conf_merge_bitmask_value, ngx_conf_merge_msec_value, ngx_conf_set_bitmask_slot, ngx_conf_bitmask_t, ngx_conf_merge_size_value ⇒ conf merge macros only
- [ ] src/event/quic/ngx_event_quic_udp.c — shares: none ⇒ nothing shared
- [ ] src/http/modules/ngx_http_memcached_module.c — shares: NGX_CONF_BITMASK_SET, ngx_conf_merge_bitmask_value, ngx_conf_merge_msec_value, ngx_conf_set_bitmask_slot, ngx_conf_bitmask_t, ngx_conf_merge_size_value ⇒ conf merge macros only
- [x] src/mail/ngx_mail_pop3_module.c — shares: NGX_MAIL_AUTH_LOGIN_ENABLED, NGX_MAIL_AUTH_PLAIN_ENABLED, ngx_mail_protocol_t, ngx_mail_capabilities, NGX_MAIL_AUTH_CRAM_MD5_ENABLED, NGX_MAIL_AUTH_EXTERNAL_ENABLED ⇒ sibling protocol module to mirror
- [ ] src/event/ngx_event_connect.h — shares: none ⇒ nothing shared
- [ ] src/http/modules/ngx_http_uwsgi_module.c — shares: NGX_CONF_BITMASK_SET, ngx_conf_merge_bitmask_value, ngx_conf_merge_msec_value, ngx_conf_set_bitmask_slot, ngx_conf_bitmask_t, ngx_conf_merge_size_value ⇒ conf merge macros only
- [ ] src/stream/ngx_stream_proxy_module.c — shares: NGX_CONF_BITMASK_SET, ngx_conf_merge_bitmask_value, ngx_conf_merge_msec_value, ngx_conf_set_bitmask_slot, ngx_conf_bitmask_t, ngx_conf_merge_size_value ⇒ conf merge macros only
- [ ] src/http/modules/ngx_http_proxy_module.c — shares: NGX_CONF_BITMASK_SET, ngx_conf_merge_bitmask_value, ngx_conf_merge_msec_value, ngx_conf_set_bitmask_slot, ngx_conf_bitmask_t, ngx_conf_merge_size_value ⇒ conf merge macros only
- [ ] src/mail/ngx_mail_ssl_module.c — shares: NGX_MAIL_SRV_CONF, NGX_MAIL_SRV_CONF_OFFSET, NGX_MAIL_MAIN_CONF, ngx_mail_module_t, NGX_MAIL_MODULE, ngx_mail_core_srv_conf_t ⇒ separate mail module; no interaction
- [ ] src/mail/ngx_mail_auth_http_module.c — shares: NGX_MAIL_SMTP_PROTOCOL, NGX_MAIL_SRV_CONF, NGX_MAIL_SRV_CONF_OFFSET, NGX_MAIL_MAIN_CONF, ngx_mail_module_t, NGX_MAIL_MODULE ⇒ uses the protocol id; never reads this conf
- [x] src/mail/ngx_mail_smtp_handler.c — shares: NGX_MAIL_AUTH_NONE_ENABLED, greeting_delay, ngx_mail_smtp_auth_state, ngx_mail_smtp_init_protocol, ngx_mail_smtp_init_session, ngx_mail_smtp_srv_conf_t ⇒ consumes the srv conf; its handlers are the protocol
- [x] src/mail/ngx_mail_core_module.c — shares: ngx_mail_conf_get_module_srv_conf, ngx_mail_capabilities, NGX_MAIL_SRV_CONF, NGX_MAIL_SRV_CONF_OFFSET, NGX_MAIL_MAIN_CONF, ngx_mail_module_t ⇒ implements ngx_mail_capabilities and protocol lookup
- [x] src/mail/ngx_mail_imap_module.c — shares: NGX_MAIL_AUTH_LOGIN_ENABLED, NGX_MAIL_AUTH_PLAIN_ENABLED, ngx_mail_protocol_t, ngx_mail_capabilities, client_buffer_size, NGX_MAIL_AUTH_CRAM_MD5_ENABLED ⇒ sibling protocol module to mirror
- [x] src/mail/ngx_mail.h — shares: NGX_MAIL_AUTH_NONE_ENABLED, ngx_mail_conf_get_module_srv_conf, NGX_MAIL_AUTH_LOGIN_ENABLED, NGX_MAIL_AUTH_PLAIN_ENABLED, NGX_MAIL_SMTP_PROTOCOL, ngx_mail_protocol_t ⇒ protocol struct, auth flags and conf macros
- [ ] src/http/ngx_http_core_module.c — shares: NGX_CONF_BITMASK_SET, ngx_conf_merge_bitmask_value, ngx_conf_merge_msec_value, ngx_conf_set_bitmask_slot, ngx_conf_bitmask_t, ngx_conf_merge_size_value ⇒ conf merge macros only
- [ ] src/mail/ngx_mail_imap_module.h — shares: client_buffer_size, auth_methods, starttls_capability, starttls_only_capability, ngx_mail, capabilities ⇒ sibling conf header only; the mirror target is its .c
- [ ] src/mail/ngx_mail_pop3_module.h — shares: auth_methods, starttls_capability, starttls_only_capability, ngx_mail, capabilities, capability ⇒ sibling conf header only; the mirror target is its .c

## query: src/os/win32/ngx_process_cycle.c
rare: CTRL_BREAK_EVENT, CTRL_CLOSE_EVENT, CTRL_C_EVENT, CTRL_LOGOFF_EVENT, CreateMutex, FreeConsole, OpenMutex, ReleaseMutex

- [ ] src/event/modules/ngx_iocp_module.c — shares: WAIT_TIMEOUT, ngx_create_thread, ngx_thread_value_t, CloseHandle, __stdcall, ngx_tid_t ⇒ own thread use; no interaction
- [ ] src/http/v3/ngx_http_v3_parse.h — shares: none ⇒ nothing shared
- [x] src/os/win32/ngx_win32_init.c — shares: ngx_unique, NGX_PROCESS_WORKER, ngx_timeofday, ngx_time_t, ngx_pid, ngx_process ⇒ sets ngx_unique/ngx_process the cycle depends on
- [ ] src/event/quic/ngx_event_quic_bpf.c — shares: ngx_inherited, ngx_core_conf_t, worker_processes, ngx_core_module, ngx_get_conf, exiting ⇒ reads core conf; no interaction
- [ ] src/event/ngx_event_connectex.c — shares: CreateEvent, SetEvent, WAIT_FAILED, WAIT_TIMEOUT, INFINITE, HANDLE ⇒ win32 event vocabulary only
- [x] src/core/ngx_cycle.c — shares: ngx_delete_pidfile, ngx_reopen_files, ngx_set_shutdown_timer, ngx_init_cycle, ngx_os_signal_process, ngx_new_binary ⇒ implements init_cycle, pidfile, reopen_files called here
- [x] src/event/ngx_event.c — shares: ngx_process_events_and_timers, ngx_event_process_posted, sig_atomic_t, ngx_worker, ngx_core_conf_t, worker_processes ⇒ worker loop body; reads ngx_process globals defined here
- [ ] src/os/unix/ngx_setaffinity.c — shares: none ⇒ nothing shared
- [x] src/core/ngx_cycle.h — shares: ngx_delete_pidfile, ngx_reopen_files, ngx_set_shutdown_timer, ngx_init_cycle, ngx_core_conf_t, worker_processes ⇒ declares the cycle API and core conf used here
- [x] src/core/ngx_connection.c — shares: ngx_close_idle_connections, ngx_close_listening_sockets, ngx_msleep, ngx_new_binary, ngx_parent, ngx_core_conf_t ⇒ close_listening_sockets tests ngx_new_binary/ngx_parent set here
- [ ] src/os/unix/ngx_socket.c — shares: ngx_socket_t ⇒ type only
- [ ] src/os/unix/ngx_process.c — shares: ngx_reconfigure, ngx_os_signal_process, ngx_reopen, NGX_PROCESS_JUST_RESPAWN, NGX_PROCESS_RESPAWN, just_spawn ⇒ unix signal side; counterpart of win32/ngx_process.c
- [ ] src/os/win32/ngx_time.h — shares: ngx_msleep ⇒ ngx_msleep macro only
- [ ] src/os/unix/ngx_process.h — shares: NGX_PROCESS_JUST_RESPAWN, NGX_PROCESS_RESPAWN, just_spawn, ngx_last_process, ngx_processes, ngx_spawn_process ⇒ unix counterpart of win32/ngx_process.h
- [x] src/os/win32/ngx_process_cycle.h — shares: ngx_close_handle, ngx_master_process_event, ngx_master_process_event_name, ngx_master_process_cycle, ngx_reopen, ngx_single_process_cycle ⇒ the header this .c implements
- [ ] src/stream/ngx_stream_proxy_module.c — shares: ngx_exiting, ngx_core_conf_t, ngx_terminate, ngx_core_module, ngx_get_conf, ngx_current_msec ⇒ reads exit flags only
- [x] src/os/unix/ngx_process_cycle.h — shares: ngx_reconfigure, ngx_master_process_cycle, ngx_reopen, ngx_single_process_cycle, ngx_inherited, ngx_quit ⇒ unix counterpart header; same globals declared
- [x] src/http/ngx_http_file_cache.c — shares: ngx_quit, ngx_msleep, ngx_path_t, ngx_terminate, ngx_pid, ngx_time_update ⇒ its manager/loader run on threads started here
- [x] src/core/nginx.c — shares: ngx_init_cycle, ngx_master_process_cycle, ngx_single_process_cycle, ngx_inherited, NGX_INVALID_PID, ngx_parent ⇒ calls master/single process cycle; sets ngx_process
- [ ] src/http/ngx_http_request.c — shares: ngx_exiting, ngx_terminate, ngx_timeofday, ngx_time_t, ngx_log_debug5, sec ⇒ reads exit flags only
- [ ] src/stream/ngx_stream_script.h — shares: none ⇒ nothing shared
- [ ] src/event/modules/ngx_win32_select_module.c — shares: ngx_msleep, connection_n, NGX_PROCESS_WORKER, ngx_time_update, ngx_process, ngx_socket_t ⇒ reads ngx_process only
- [x] src/os/unix/ngx_process_cycle.c — shares: ngx_cache_manager_process_handler, ngx_master_process_exit, ngx_start_worker_processes, ngx_worker_process_cycle, ngx_worker_process_exit, exit_master ⇒ the unix counterpart of this file
- [x] src/os/win32/ngx_process.c — shares: EVENT_MODIFY_STATE, GetExitCodeProcess, OpenEvent, ResetEvent, TerminateProcess, WAIT_OBJECT_0 ⇒ spawn_process, events, signal_process used here
- [x] src/os/win32/ngx_process.h — shares: MAXIMUM_WAIT_OBJECTS, NGX_PROCESS_SYNC_NAME, ngx_cache_manager_mutex_, quit_event, reopen_event, NGX_PROCESS_JUST_RESPAWN ⇒ process table, event names, sync name length
- [x] src/os/win32/ngx_thread.c — shares: ngx_create_thread, ngx_thread_value_t, __stdcall, ngx_tid_t, tid ⇒ implements ngx_create_thread the worker/cache threads use
- [x] src/os/win32/ngx_thread.h — shares: ngx_create_thread, ngx_thread_value_t, __stdcall, ngx_tid_t, tid, HANDLE ⇒ declares ngx_create_thread and the thread types used here
