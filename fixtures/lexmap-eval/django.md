# lexmap relatedness labels
repo: /Users/apple/Documents/APLICATII BIJUTERIE/legacy-codebases/django
identity: HEAD 4d455ae, 6 uncommitted entries, inputs sha256:e8a77094f59db23fce655100c4c7ed999186df204bd6d43464e6fae5be3a87b7
seed: 1
median-tokens: 30

How to label: for each candidate, would a reviewer of a change in the query file need to open this file to judge the change — because it defines what the query uses, uses what the query defines, or is the other half of the same feature (schema, contract, consumer, sibling implementation)? Mark [x] yes, [ ] no, [?] cannot tell. Sharing only framework vocabulary, or merely sitting in the same layer, is "no". Open the files; the "shares" list is orientation, not evidence. Add a short reason after "⇒".

## query: django/conf/locale/ms/formats.py
rare: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT, FIRST_DAY_OF_WEEK, NUMBER_GROUPING

- [ ] django/conf/locale/ml/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/contrib/gis/db/backends/base/operations.py — shares: none ⇒
- [ ] django/contrib/gis/gdal/libgdal.py — shares: none ⇒
- [ ] django/conf/locale/ar_DZ/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/es_AR/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/el/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/cs/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/contrib/sites/management.py — shares: none ⇒
- [ ] django/conf/locale/ka/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/sk/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/contrib/gis/gdal/prototypes/srs.py — shares: none ⇒
- [ ] django/contrib/staticfiles/urls.py — shares: none ⇒
- [ ] django/conf/locale/ht/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/sr/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/en_CA/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/de/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/en_IE/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/en/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/id/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/en_AU/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/sr_Latn/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/de_CH/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/pt/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/ko/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/en_GB/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒

## query: django/contrib/sessions/backends/file.py
rare: _expiry_date, _last_modification, _out_, expiry_age, md5s, output_file_fd, output_file_name, session_file_name

- [ ] django/contrib/admin/static/admin/js/prepopulate_init.js — shares: none ⇒
- [ ] django/contrib/sessions/backends/base.py — shares: VALID_KEY_CHARS, _session_expiry, CreateError, _get_session, no_load, _get_or_create_session_key ⇒
- [ ] django/contrib/sessions/backends/cached_db.py — shares: _get_or_create_session_key, get_expiry_age, _session_key, must_create, session_data, session_key ⇒
- [ ] django/template/defaulttags.py — shares: USE_TZ, AttributeError, __class__, __name__, Implement, cleaner ⇒
- [ ] django/core/files/move.py — shares: O_BINARY, O_CREAT, O_EXCL, O_WRONLY, FileExistsError, shutil ⇒
- [ ] django/contrib/sessions/backends/signed_cookies.py — shares: get_session_cookie_age, aclear_expired, clear_expired, _session_key, must_create, SessionBase ⇒
- [ ] django/db/models/query.py — shares: USE_TZ, AttributeError, __class__, __name__, aexists, adelete ⇒
- [ ] django/core/management/commands/makemessages.py — shares: ImproperlyConfigured, __class__, __name__, messing, unlink, isdir ⇒
- [ ] django/contrib/sessions/backends/cache.py — shares: CreateError, _get_session, no_load, _get_or_create_session_key, UpdateError, _get_new_session_key ⇒
- [ ] django/conf/global_settings.py — shares: SESSION_FILE_PATH, SESSION_COOKIE_NAME, SESSION_SAVE_EVERY_REQUEST, SuspiciousOperation, USE_TZ, rejected ⇒
- [ ] django/db/models/sql/query.py — shares: AttributeError, __class__, __name__, issubset, Prevent, removeprefix ⇒
- [ ] django/core/cache/backends/filebased.py — shares: _key_to_file, FileNotFoundError, EOFError, mkstemp, expiry, expired ⇒
- [ ] django/contrib/admin/views/main.py — shares: SuspiciousOperation, USE_TZ, ImproperlyConfigured, AttributeError, __class__, removeprefix ⇒
- [ ] django/contrib/sessions/middleware.py — shares: UpdateError, get_expiry_age, SESSION_COOKIE_NAME, SESSION_SAVE_EVERY_REQUEST, session_key, SessionStore ⇒
- [ ] django/db/models/fields/__init__.py — shares: USE_TZ, AttributeError, __class__, __name__, removeprefix, ascii ⇒
- [ ] django/contrib/sessions/backends/db.py — shares: CreateError, _get_session, no_load, _get_or_create_session_key, UpdateError, _get_new_session_key ⇒
- [ ] django/contrib/admin/static/admin/js/vendor/select2/i18n/hr.js — shares: none ⇒
- [ ] django/contrib/admin/static/admin/js/vendor/jquery/jquery.js — shares: doubling, Implement, rejected, Prevent, lock, overhead ⇒
- [ ] django/core/files/storage/filesystem.py — shares: O_BINARY, O_CREAT, O_EXCL, O_WRONLY, FileExistsError, FileNotFoundError ⇒
- [ ] django/db/backends/postgresql/operations.py — shares: USE_TZ, components, decode, startswith, seconds, prefix ⇒
- [ ] django/contrib/gis/management/commands/ogrinspect.py — shares: split ⇒
- [ ] django/utils/autoreload.py — shares: st_mtime, FileNotFoundError, getLogger, __class__, __name__, stat ⇒
- [ ] django/contrib/sessions/management/commands/clearsessions.py — shares: clear_expired, SessionStore, expired, Session, supports, sessions ⇒
- [ ] django/http/request.py — shares: ImproperlyConfigured, AttributeError, __class__, __name__, expired, removeprefix ⇒
- [ ] django/db/backends/base/base.py — shares: getLogger, USE_TZ, ImproperlyConfigured, __class__, disabling, threads ⇒

## query: django/db/migrations/exceptions.py
rare: BadMigrationError, MigrationSchemaMissing, InvalidBasesError, InvalidMigrationPlan, IrreversibleError, CircularDependencyError, InconsistentMigrationHistory, NodeNotFoundError

- [ ] django/http/request.py — shares: LookupError, RuntimeError, __repr__, __str__, matches, etc ⇒
- [ ] django/conf/locale/pl/formats.py — shares: none ⇒
- [ ] django/core/management/commands/migrate.py — shares: AmbiguityError, LookupError, graph, matches, migration, etc ⇒
- [ ] django/contrib/gis/gdal/feature.py — shares: __str__ ⇒
- [ ] django/core/serializers/xml_serializer.py — shares: LookupError, __repr__, __str__, node, etc, Exception ⇒
- [ ] django/db/migrations/serializer.py — shares: migration, prefix ⇒
- [ ] django/apps/config.py — shares: LookupError, RuntimeError, __repr__, Exception, classes ⇒
- [ ] django/core/management/commands/sqlmigrate.py — shares: AmbiguityError, LookupError, graph, matches, migration, More ⇒
- [ ] django/db/models/expressions.py — shares: DatabaseError, __repr__, __str__, node, reversed, resolved ⇒
- [ ] django/db/migrations/graph.py — shares: CircularDependencyError, NodeNotFoundError, __repr__, __str__, graph, node ⇒
- [ ] django/db/migrations/autodetector.py — shares: LookupError, graph, impossible, circular, node, dependency ⇒
- [ ] django/db/migrations/migration.py — shares: IrreversibleError, __repr__, __str__, irreversible, dependency, migration ⇒
- [ ] django/db/migrations/recorder.py — shares: MigrationSchemaMissing, DatabaseError, __str__, migration, applied ⇒
- [ ] django/db/migrations/loader.py — shares: BadMigrationError, InconsistentMigrationHistory, NodeNotFoundError, AmbiguityError, graph, circular ⇒
- [ ] django/contrib/admin/options.py — shares: LookupError, __repr__, __str__, bad, attempt, etc ⇒
- [ ] django/db/models/sql/compiler.py — shares: DatabaseError, RuntimeError, __repr__, impossible, node, resolved ⇒
- [ ] django/contrib/messages/context_processors.py — shares: none ⇒
- [ ] django/core/management/commands/optimizemigration.py — shares: AmbiguityError, LookupError, graph, matches, migration, More ⇒
- [ ] django/core/management/commands/squashmigrations.py — shares: AmbiguityError, LookupError, graph, dependency, matches, migration ⇒
- [ ] django/db/migrations/state.py — shares: InvalidBasesError, LookupError, __repr__, dependency, resolve, etc ⇒
- [ ] django/db/backends/base/base.py — shares: DatabaseError, RuntimeError, __repr__, etc, Exception, applied ⇒
- [ ] django/db/models/base.py — shares: LookupError, DatabaseError, RuntimeError, __repr__, __str__, reversed ⇒
- [ ] django/template/base.py — shares: __repr__, __str__, node, reversed, resolved, matches ⇒
- [ ] django/db/models/sql/query.py — shares: RuntimeError, __repr__, __str__, reversed, resolved, matches ⇒
- [ ] django/conf/locale/ky/formats.py — shares: none ⇒

## query: django/http/multipartparser.py
rare: ChunkIter, InputStreamExhausted, InterBoundaryIter, UploadHandler, _boundary, _chunk_size, _close_files, _done

- [ ] django/db/models/sql/query.py — shares: regex_helper, _lazy_re_compile, __iter__, __all__, AttributeError, field_name ⇒
- [ ] django/contrib/admin/options.py — shares: LookupError, IndexError, KeyError, content_type, AttributeError, field_name ⇒
- [ ] django/db/models/base.py — shares: StopIteration, force_str, LookupError, IndexError, KeyError, AttributeError ⇒
- [ ] django/views/debug.py — shares: MultiValueDict, force_str, regex_helper, _lazy_re_compile, IndexError, KeyError ⇒
- [ ] django/core/files/uploadhandler.py — shares: SkipFile, StopFutureHandlers, connection_reset, upload_complete, StopUpload, file_complete ⇒
- [ ] django/forms/models.py — shares: _mutable, QueryDict, IndexError, __iter__, KeyError, __all__ ⇒
- [ ] django/forms/fields.py — shares: file_name, regex_helper, _lazy_re_compile, IndexError, __iter__, content_type ⇒
- [ ] django/template/defaulttags.py — shares: QueryDict, __iter__, KeyError, AttributeError, counters, verbatim ⇒
- [ ] django/db/models/fields/__init__.py — shares: _empty, b64decode, UnicodeEncodeError, base64, KeyError, __all__ ⇒
- [ ] django/core/handlers/asgi.py — shares: _files, _post, _stream, RequestDataTooBig, CONTENT_LENGTH, CONTENT_TYPE ⇒
- [ ] django/http/request.py — shares: _upload_handlers, _encoding, header_name, upload_handlers, _files, _mutable ⇒
- [ ] django/template/base.py — shares: regex_helper, _lazy_re_compile, IndexError, KeyError, AttributeError, Parser ⇒
- [ ] django/conf/global_settings.py — shares: header_name, TooManyFilesSent, DATA_UPLOAD_MAX_NUMBER_FIELDS, TooManyFieldsSent, DATA_UPLOAD_MAX_NUMBER_FILES, RequestDataTooBig ⇒
- [ ] django/core/exceptions.py — shares: SuspiciousMultipartForm, TooManyFilesSent, DATA_UPLOAD_MAX_NUMBER_FIELDS, TooManyFieldsSent, DATA_UPLOAD_MAX_NUMBER_FILES, RequestDataTooBig ⇒
- [ ] django/db/models/query.py — shares: chunk_size, __iter__, KeyError, AttributeError, field_name, _meta ⇒
- [ ] django/db/models/fields/mixins.py — shares: KeyError, extend, instances ⇒
- [ ] django/contrib/admin/static/admin/js/vendor/xregexp/xregexp.js — shares: throwing, TYPE, thrown, completion, exceeded, structures ⇒
- [ ] django/core/checks/database.py — shares: extend ⇒
- [ ] django/db/models/sql/compiler.py — shares: chunk_size, regex_helper, _lazy_re_compile, _meta, deque, Will ⇒
- [ ] django/utils/timesince.py — shares: chunk, remaining, latter, Find, processing, enumerate ⇒
- [ ] django/core/handlers/wsgi.py — shares: _encoding, _files, _post, _stream, content_length, CONTENT_LENGTH ⇒
- [ ] django/contrib/admin/static/admin/js/vendor/jquery/jquery.js — shares: excess, leftover, urlencoded, boundaries, thrown, completion ⇒
- [ ] django/utils/http.py — shares: __next__, parse_header_parameters, UnicodeEncodeError, MultiValueDict, base64, regex_helper ⇒
- [ ] django/contrib/staticfiles/views.py — shares: lstrip, split, find ⇒
- [ ] django/conf/locale/__init__.py — shares: special ⇒

## query: django/http/request.py
rare: HTTP_PREFIX, UNPREFIXED_HEADERS, _assert_mutable, _body, _check_data_too_big, _current_scheme_host, _get_full_path, _initialize_handlers

- [ ] django/db/models/fields/__init__.py — shares: __copy__, __deepcopy__, __qualname__, __repr__, KeyError, cached_property ⇒
- [ ] django/db/models/query.py — shares: __deepcopy__, from_iterable, __getitem__, __iter__, __repr__, KeyError ⇒
- [ ] django/core/handlers/asgi.py — shares: _read_started, _set_content_type_params, _get_scheme, _load_post_and_files, SpooledTemporaryFile, _files ⇒
- [ ] django/contrib/gis/utils/srs.py — shares: Thus, Exception, hasattr ⇒
- [ ] django/contrib/admin/options.py — shares: BadRequest, parse_qsl, build_absolute_uri, get_full_path, resolver_match, query_string ⇒
- [ ] django/core/handlers/wsgi.py — shares: _encoding, _read_started, _set_content_type_params, _get_scheme, _load_post_and_files, _files ⇒
- [ ] django/core/signals.py — shares: none ⇒
- [ ] django/views/debug.py — shares: _get_raw_host, get_preferred_type, MultiValueDict, get_full_path, path_info, resolver_match ⇒
- [ ] django/db/models/sql/query.py — shares: __deepcopy__, from_iterable, regex_helper, _lazy_re_compile, RuntimeError, __iter__ ⇒
- [ ] django/http/response.py — shares: CaseInsensitiveMapping, SEEK_END, get_cookie_signer, __delitem__, DEFAULT_CHARSET, iri_to_uri ⇒
- [ ] django/db/models/base.py — shares: from_iterable, force_str, LookupError, RuntimeError, __qualname__, __repr__ ⇒
- [ ] django/contrib/admin/static/admin/js/vendor/jquery/jquery.js — shares: Discard, urlencoded, Limit, Attempt, Strip, URI ⇒
- [ ] django/conf/global_settings.py — shares: header_value, header_name, FILE_UPLOAD_HANDLERS, USE_X_FORWARDED_HOST, TooManyFilesSent, USE_X_FORWARDED_PORT ⇒
- [ ] django/forms/widgets.py — shares: list_, __deepcopy__, from_iterable, regex_helper, _lazy_re_compile, __getitem__ ⇒
- [ ] django/contrib/auth/migrations/0005_alter_user_last_login_null.py — shares: none ⇒
- [ ] django/template/base.py — shares: UnicodeDecodeError, regex_helper, _lazy_re_compile, __getitem__, __qualname__, __repr__ ⇒
- [ ] django/urls/resolvers.py — shares: MultiValueDict, regex_helper, _lazy_re_compile, __getitem__, __qualname__, __repr__ ⇒
- [ ] django/middleware/csrf.py — shares: parse_header_name, header_name, is_same_domain, server_port, HttpHeaders, get_port ⇒
- [ ] django/forms/fields.py — shares: __deepcopy__, BytesIO, regex_helper, _lazy_re_compile, __iter__, content_type ⇒
- [ ] django/template/defaulttags.py — shares: resolver_match, query_string, QueryDict, __iter__, __qualname__, __repr__ ⇒
- [ ] django/db/models/functions/text.py — shares: Length, ASCII, corresponding, upper, params, lower ⇒
- [ ] django/utils/datastructures.py — shares: default_list, CaseInsensitiveMapping, ImmutableList, list_, __copy__, __delitem__ ⇒
- [ ] django/utils/http.py — shares: is_same_domain, parse_header_parameters, allowed_hosts, iri_to_uri, MultiValueDict, UnicodeDecodeError ⇒
- [ ] django/http/multipartparser.py — shares: _upload_handlers, _encoding, header_name, upload_handlers, _files, _mutable ⇒
- [ ] django/contrib/gis/db/backends/oracle/operations.py — shares: cached_property, compliant, Length, starts, convert, parser ⇒

## query: django/utils/module_loading.py
rare: _initializing, before_import_registry, cached_import, full_module_name, importlib_find, module_to_search, package_path, dotted_path

- [ ] django/db/models/sql/query.py — shares: AttributeError, __name__, Decide, forces, initialized, Raise ⇒
- [ ] django/db/models/fields/json.py — shares: paths, present, split, parameter, over, getattr ⇒
- [ ] django/core/management/commands/migrate.py — shares: module_has_submodule, get_app_configs, import_module, app_config, Import, importlib ⇒
- [ ] django/db/models/options.py — shares: import_string, app_config, ImportError, AttributeError, __name__, registry ⇒
- [ ] django/core/management/commands/shell.py — shares: import_module, import_string, ImportError, INSTALLED_APPS, AttributeError, __name__ ⇒
- [ ] django/contrib/admin/sites.py — shares: AlreadyRegistered, NotRegistered, _registry, get_app_configs, import_string, app_config ⇒
- [ ] django/core/management/__init__.py — shares: __path__, get_app_configs, import_module, app_config, ImportError, INSTALLED_APPS ⇒
- [ ] django/apps/registry.py — shares: get_app_configs, app_config, INSTALLED_APPS, __name__, Import, dotted ⇒
- [ ] django/utils/translation/trans_real.py — shares: get_app_configs, app_config, __file__, AttributeError, initialized, Raise ⇒
- [ ] django/apps/config.py — shares: module_has_submodule, __path__, import_module, import_string, __file__, ImportError ⇒
- [ ] django/db/backends/base/creation.py — shares: get_app_configs, import_string, app_config, ImportError, INSTALLED_APPS, modules ⇒
- [ ] django/contrib/contenttypes/forms.py — shares: Exception, provide ⇒
- [ ] django/contrib/admin/static/admin/js/vendor/select2/i18n/ja.js — shares: define ⇒
- [ ] django/db/migrations/questioner.py — shares: __path__, import_module, app_config, __file__, ImportError, __name__ ⇒
- [ ] django/conf/locale/id/formats.py — shares: none ⇒
- [ ] django/contrib/admin/options.py — shares: NotRegistered, _registry, module_name, AttributeError, class_name, __name__ ⇒
- [ ] django/template/backends/django.py — shares: module_path, __path__, get_app_configs, import_module, app_config, module_name ⇒
- [ ] django/db/migrations/loader.py — shares: ModuleNotFoundError, __path__, get_app_configs, import_module, app_config, __file__ ⇒
- [ ] django/contrib/admin/checks.py — shares: NotRegistered, import_string, ImportError, INSTALLED_APPS, AttributeError, __name__ ⇒
- [ ] django/core/management/templates.py — shares: find_spec, __spec__, __path__, util, bits, importlib ⇒
- [ ] django/db/utils.py — shares: __path__, import_module, import_string, app_config, ImportError, AttributeError ⇒
- [ ] django/db/models/functions/datetime.py — shares: __name__, copy, Cannot, getattr ⇒
- [ ] django/utils/autoreload.py — shares: __spec__, __file__, ImportError, __name__, spec, directories ⇒
- [ ] django/db/models/base.py — shares: app_config, INSTALLED_APPS, AttributeError, __name__, Auto, initialized ⇒
- [ ] django/db/migrations/writer.py — shares: module_dir, import_module, app_config, ImportError, importlib, register ⇒
