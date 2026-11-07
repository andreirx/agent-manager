# lexmap relatedness labels
repo: /Users/apple/Documents/APLICATII BIJUTERIE/legacy-codebases/django
identity: HEAD 4d455ae, 6 uncommitted entries, inputs sha256:e8a77094f59db23fce655100c4c7ed999186df204bd6d43464e6fae5be3a87b7
seed: 1
median-tokens: 30

How to label: for each candidate, would a reviewer of a change in the query file need to open this file to judge the change — because it defines what the query uses, uses what the query defines, or is the other half of the same feature (schema, contract, consumer, sibling implementation)? Mark [x] yes, [ ] no, [?] cannot tell. Sharing only framework vocabulary, or merely sitting in the same layer, is "no". Open the files; the "shares" list is orientation, not evidence. Add a short reason after "⇒".

## query: django/conf/locale/ms/formats.py
rare: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT, FIRST_DAY_OF_WEEK, NUMBER_GROUPING

- [ ] django/conf/locale/ml/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats; no interaction
- [ ] django/contrib/gis/db/backends/base/operations.py — shares: none ⇒ unrelated GIS backend
- [ ] django/contrib/gis/gdal/libgdal.py — shares: none ⇒ unrelated GDAL loader
- [ ] django/conf/locale/ar_DZ/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/es_AR/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/el/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/cs/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/contrib/sites/management.py — shares: none ⇒ unrelated sites bootstrap
- [ ] django/conf/locale/ka/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/sk/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/contrib/gis/gdal/prototypes/srs.py — shares: none ⇒ unrelated GDAL prototypes
- [ ] django/contrib/staticfiles/urls.py — shares: none ⇒ unrelated staticfiles urls
- [ ] django/conf/locale/ht/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/sr/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/en_CA/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/de/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/en_IE/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/en/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ en formats; ms does not inherit from it
- [ ] django/conf/locale/id/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/en_AU/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/sr_Latn/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/de_CH/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/pt/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/ko/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/en_GB/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒ another locale's independent formats
- [ ] django/conf/locale/es_CO/formats.py — shares: MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT, FIRST_DAY_OF_WEEK, NUMBER_GROUPING ⇒
- [ ] django/conf/locale/da/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/mk/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/sl/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/es_PR/formats.py — shares: MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT, FIRST_DAY_OF_WEEK, NUMBER_GROUPING ⇒
- [ ] django/conf/locale/ar/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/bs/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/ca/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/ckb/formats.py — shares: _INPUT_FORMATS, _FORMAT, MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT ⇒
- [ ] django/conf/locale/es_NI/formats.py — shares: MONTH_DAY_FORMAT, SHORT_DATE_FORMAT, YEAR_MONTH_FORMAT, SHORT_DATETIME_FORMAT, FIRST_DAY_OF_WEEK, NUMBER_GROUPING ⇒

## query: django/contrib/sessions/backends/file.py
rare: _expiry_date, _last_modification, _out_, expiry_age, md5s, output_file_fd, output_file_name, session_file_name

- [ ] django/contrib/admin/static/admin/js/prepopulate_init.js — shares: none ⇒ unrelated admin JS
- [x] django/contrib/sessions/backends/base.py — shares: VALID_KEY_CHARS, _session_expiry, CreateError, _get_session, no_load, _get_or_create_session_key ⇒ SessionBase, CreateError/UpdateError the store extends and raises
- [x] django/contrib/sessions/backends/cached_db.py — shares: _get_or_create_session_key, get_expiry_age, _session_key, must_create, session_data, session_key ⇒ sibling session backend; same save/load contract to mirror
- [ ] django/template/defaulttags.py — shares: USE_TZ, AttributeError, __class__, __name__, Implement, cleaner ⇒ template tags; shares only stdlib names
- [ ] django/core/files/move.py — shares: O_BINARY, O_CREAT, O_EXCL, O_WRONLY, FileExistsError, shutil ⇒ same os.open flags idiom, no interaction
- [x] django/contrib/sessions/backends/signed_cookies.py — shares: get_session_cookie_age, aclear_expired, clear_expired, _session_key, must_create, SessionBase ⇒ sibling SessionBase backend; clear_expired contract to mirror
- [ ] django/db/models/query.py — shares: USE_TZ, AttributeError, __class__, __name__, aexists, adelete ⇒ ORM; shares only generic names
- [ ] django/core/management/commands/makemessages.py — shares: ImproperlyConfigured, __class__, __name__, messing, unlink, isdir ⇒ unrelated command; stdlib file ops
- [x] django/contrib/sessions/backends/cache.py — shares: CreateError, _get_session, no_load, _get_or_create_session_key, UpdateError, _get_new_session_key ⇒ sibling backend; same create/save/must_create protocol
- [ ] django/conf/global_settings.py — shares: SESSION_FILE_PATH, SESSION_COOKIE_NAME, SESSION_SAVE_EVERY_REQUEST, SuspiciousOperation, USE_TZ, rejected ⇒ only SESSION_FILE_PATH default; settings registry
- [ ] django/db/models/sql/query.py — shares: AttributeError, __class__, __name__, issubset, Prevent, removeprefix ⇒ SQL query compiler; generic names
- [ ] django/core/cache/backends/filebased.py — shares: _key_to_file, FileNotFoundError, EOFError, mkstemp, expiry, expired ⇒ parallel file cache; no shared code
- [ ] django/contrib/admin/views/main.py — shares: SuspiciousOperation, USE_TZ, ImproperlyConfigured, AttributeError, __class__, removeprefix ⇒ admin changelist; generic names
- [x] django/contrib/sessions/middleware.py — shares: UpdateError, get_expiry_age, SESSION_COOKIE_NAME, SESSION_SAVE_EVERY_REQUEST, session_key, SessionStore ⇒ drives SessionStore save/load, catches UpdateError
- [ ] django/db/models/fields/__init__.py — shares: USE_TZ, AttributeError, __class__, __name__, removeprefix, ascii ⇒ model fields; generic names
- [x] django/contrib/sessions/backends/db.py — shares: CreateError, _get_session, no_load, _get_or_create_session_key, UpdateError, _get_new_session_key ⇒ sibling backend; same create/save/must_create protocol
- [ ] django/contrib/admin/static/admin/js/vendor/select2/i18n/hr.js — shares: none ⇒ vendored JS locale
- [ ] django/contrib/admin/static/admin/js/vendor/jquery/jquery.js — shares: doubling, Implement, rejected, Prevent, lock, overhead ⇒ vendored jQuery; comment words only
- [ ] django/core/files/storage/filesystem.py — shares: O_BINARY, O_CREAT, O_EXCL, O_WRONLY, FileExistsError, FileNotFoundError ⇒ same O_EXCL idiom, no interaction
- [ ] django/db/backends/postgresql/operations.py — shares: USE_TZ, components, decode, startswith, seconds, prefix ⇒ DB operations; generic names
- [ ] django/contrib/gis/management/commands/ogrinspect.py — shares: split ⇒ unrelated GIS command
- [ ] django/utils/autoreload.py — shares: st_mtime, FileNotFoundError, getLogger, __class__, __name__, stat ⇒ st_mtime coincidence; no interaction
- [x] django/contrib/sessions/management/commands/clearsessions.py — shares: clear_expired, SessionStore, expired, Session, supports, sessions ⇒ calls SessionStore.clear_expired the store implements
- [ ] django/http/request.py — shares: ImproperlyConfigured, AttributeError, __class__, __name__, expired, removeprefix ⇒ request object; generic names
- [ ] django/db/backends/base/base.py — shares: getLogger, USE_TZ, ImproperlyConfigured, __class__, disabling, threads ⇒ DB wrapper; generic names
- [ ] django/contrib/sessions/exceptions.py — shares: InvalidSessionKey, SuspiciousOperation, session ⇒
- [ ] django/core/mail/backends/filebased.py — shares: FileExistsError, OSError, ImproperlyConfigured, finally, open, close ⇒

## query: django/db/migrations/exceptions.py
rare: BadMigrationError, MigrationSchemaMissing, InvalidBasesError, InvalidMigrationPlan, IrreversibleError, CircularDependencyError, InconsistentMigrationHistory, NodeNotFoundError

- [ ] django/http/request.py — shares: LookupError, RuntimeError, __repr__, __str__, matches, etc ⇒ unrelated; stdlib exception names
- [ ] django/conf/locale/pl/formats.py — shares: none ⇒ locale formats
- [x] django/core/management/commands/migrate.py — shares: AmbiguityError, LookupError, graph, matches, migration, etc ⇒ catches AmbiguityError (via loader re-export)
- [ ] django/contrib/gis/gdal/feature.py — shares: __str__ ⇒ GDAL feature; __str__ only
- [ ] django/core/serializers/xml_serializer.py — shares: LookupError, __repr__, __str__, node, etc, Exception ⇒ serializer; generic names
- [ ] django/db/migrations/serializer.py — shares: migration, prefix ⇒ value serializer; does not use these exceptions
- [ ] django/apps/config.py — shares: LookupError, RuntimeError, __repr__, Exception, classes ⇒ app config; generic names
- [x] django/core/management/commands/sqlmigrate.py — shares: AmbiguityError, LookupError, graph, matches, migration, More ⇒ catches AmbiguityError
- [ ] django/db/models/expressions.py — shares: DatabaseError, __repr__, __str__, node, reversed, resolved ⇒ ORM expressions; generic names
- [x] django/db/migrations/graph.py — shares: CircularDependencyError, NodeNotFoundError, __repr__, __str__, graph, node ⇒ raises CircularDependencyError, NodeNotFoundError
- [ ] django/db/migrations/autodetector.py — shares: LookupError, graph, impossible, circular, node, dependency ⇒ no exception from this module used
- [x] django/db/migrations/migration.py — shares: IrreversibleError, __repr__, __str__, irreversible, dependency, migration ⇒ raises IrreversibleError
- [x] django/db/migrations/recorder.py — shares: MigrationSchemaMissing, DatabaseError, __str__, migration, applied ⇒ raises MigrationSchemaMissing
- [x] django/db/migrations/loader.py — shares: BadMigrationError, InconsistentMigrationHistory, NodeNotFoundError, AmbiguityError, graph, circular ⇒ raises/catches BadMigration, Ambiguity, NodeNotFound, Inconsistent
- [ ] django/contrib/admin/options.py — shares: LookupError, __repr__, __str__, bad, attempt, etc ⇒ admin; generic names
- [ ] django/db/models/sql/compiler.py — shares: DatabaseError, RuntimeError, __repr__, impossible, node, resolved ⇒ SQL compiler; generic names
- [ ] django/contrib/messages/context_processors.py — shares: none ⇒ unrelated
- [x] django/core/management/commands/optimizemigration.py — shares: AmbiguityError, LookupError, graph, matches, migration, More ⇒ imports and catches AmbiguityError
- [x] django/core/management/commands/squashmigrations.py — shares: AmbiguityError, LookupError, graph, dependency, matches, migration ⇒ catches AmbiguityError
- [x] django/db/migrations/state.py — shares: InvalidBasesError, LookupError, __repr__, dependency, resolve, etc ⇒ raises/catches InvalidBasesError
- [ ] django/db/backends/base/base.py — shares: DatabaseError, RuntimeError, __repr__, etc, Exception, applied ⇒ DatabaseError origin only; no migration exception
- [ ] django/db/models/base.py — shares: LookupError, DatabaseError, RuntimeError, __repr__, __str__, reversed ⇒ model base; generic names
- [ ] django/template/base.py — shares: __repr__, __str__, node, reversed, resolved, matches ⇒ template engine; generic names
- [ ] django/db/models/sql/query.py — shares: RuntimeError, __repr__, __str__, reversed, resolved, matches ⇒ SQL query; generic names
- [ ] django/conf/locale/ky/formats.py — shares: none ⇒ locale formats
- [ ] django/core/checks/messages.py — shares: __repr__, __str__ ⇒
- [ ] django/contrib/contenttypes/migrations/0002_remove_content_type_name.py — shares: LookupError, dependencies ⇒
- [ ] django/core/checks/translation.py — shares: LookupError ⇒
- [ ] django/utils/tree.py — shares: __repr__, __str__, graph, node ⇒
- [ ] django/core/files/base.py — shares: __repr__, __str__ ⇒
- [ ] django/db/backends/ddl_references.py — shares: __repr__, __str__, migration ⇒
- [ ] django/core/exceptions.py — shares: __repr__, __str__, impossible, matches, Exception, classes ⇒
- [ ] django/contrib/auth/management/__init__.py — shares: LookupError, RuntimeError, resolve, etc ⇒

## query: django/http/multipartparser.py
rare: ChunkIter, InputStreamExhausted, InterBoundaryIter, UploadHandler, _boundary, _chunk_size, _close_files, _done

- [ ] django/db/models/sql/query.py — shares: regex_helper, _lazy_re_compile, __iter__, __all__, AttributeError, field_name ⇒ ORM; shared helper names only
- [ ] django/contrib/admin/options.py — shares: LookupError, IndexError, KeyError, content_type, AttributeError, field_name ⇒ admin; generic names
- [ ] django/db/models/base.py — shares: StopIteration, force_str, LookupError, IndexError, KeyError, AttributeError ⇒ model base; generic names
- [ ] django/views/debug.py — shares: MultiValueDict, force_str, regex_helper, _lazy_re_compile, IndexError, KeyError ⇒ cleanses POST/FILES; never touches the parser
- [x] django/core/files/uploadhandler.py — shares: SkipFile, StopFutureHandlers, connection_reset, upload_complete, StopUpload, file_complete ⇒ defines handler protocol and SkipFile/StopUpload the parser drives
- [ ] django/forms/models.py — shares: _mutable, QueryDict, IndexError, __iter__, KeyError, __all__ ⇒ forms; generic names
- [ ] django/forms/fields.py — shares: file_name, regex_helper, _lazy_re_compile, IndexError, __iter__, content_type ⇒ form fields; generic names
- [ ] django/template/defaulttags.py — shares: QueryDict, __iter__, KeyError, AttributeError, counters, verbatim ⇒ template tags; QueryDict only
- [ ] django/db/models/fields/__init__.py — shares: _empty, b64decode, UnicodeEncodeError, base64, KeyError, __all__ ⇒ model fields; base64 coincidence
- [ ] django/core/handlers/asgi.py — shares: _files, _post, _stream, RequestDataTooBig, CONTENT_LENGTH, CONTENT_TYPE ⇒ reaches parser only via HttpRequest._load_post_and_files
- [x] django/http/request.py — shares: _upload_handlers, _encoding, header_name, upload_handlers, _files, _mutable ⇒ instantiates MultiPartParser; the request behind the parser
- [ ] django/template/base.py — shares: regex_helper, _lazy_re_compile, IndexError, KeyError, AttributeError, Parser ⇒ template lexer; generic names
- [ ] django/conf/global_settings.py — shares: header_name, TooManyFilesSent, DATA_UPLOAD_MAX_NUMBER_FIELDS, TooManyFieldsSent, DATA_UPLOAD_MAX_NUMBER_FILES, RequestDataTooBig ⇒ only DATA_UPLOAD_* defaults; settings registry
- [x] django/core/exceptions.py — shares: SuspiciousMultipartForm, TooManyFilesSent, DATA_UPLOAD_MAX_NUMBER_FIELDS, TooManyFieldsSent, DATA_UPLOAD_MAX_NUMBER_FILES, RequestDataTooBig ⇒ defines RequestDataTooBig/TooMany*/SuspiciousMultipartForm it raises
- [ ] django/db/models/query.py — shares: chunk_size, __iter__, KeyError, AttributeError, field_name, _meta ⇒ QuerySet; chunk_size coincidence
- [ ] django/db/models/fields/mixins.py — shares: KeyError, extend, instances ⇒ unrelated mixins
- [ ] django/contrib/admin/static/admin/js/vendor/xregexp/xregexp.js — shares: throwing, TYPE, thrown, completion, exceeded, structures ⇒ vendored JS
- [ ] django/core/checks/database.py — shares: extend ⇒ unrelated check
- [ ] django/db/models/sql/compiler.py — shares: chunk_size, regex_helper, _lazy_re_compile, _meta, deque, Will ⇒ SQL compiler; generic names
- [ ] django/utils/timesince.py — shares: chunk, remaining, latter, Find, processing, enumerate ⇒ unrelated; 'chunk' coincidence
- [ ] django/core/handlers/wsgi.py — shares: _encoding, _files, _post, _stream, content_length, CONTENT_LENGTH ⇒ reaches parser only via HttpRequest._load_post_and_files
- [ ] django/contrib/admin/static/admin/js/vendor/jquery/jquery.js — shares: excess, leftover, urlencoded, boundaries, thrown, completion ⇒ vendored jQuery
- [x] django/utils/http.py — shares: __next__, parse_header_parameters, UnicodeEncodeError, MultiValueDict, base64, regex_helper ⇒ parse_header_parameters helper the parser imports
- [ ] django/contrib/staticfiles/views.py — shares: lstrip, split, find ⇒ unrelated view
- [ ] django/conf/locale/__init__.py — shares: special ⇒ locale table
- [ ] django/core/files/uploadedfile.py — shares: content_type_extra, chunk_size, content_type, __all__, field_name, Sanitize ⇒
- [ ] django/core/serializers/python.py — shares: __next__, chunk_size, LookupError, __iter__, field_name, _meta ⇒
- [ ] django/http/response.py — shares: DEFAULT_CHARSET, regex_helper, _lazy_re_compile, __iter__, content_type, AttributeError ⇒
- [ ] django/utils/datastructures.py — shares: MultiValueDict, QueryDict, IndexError, __iter__, KeyError, AttributeError ⇒
- [ ] django/core/mail/message.py — shares: UnicodeEncodeError, DEFAULT_CHARSET, force_str, IndexError, KeyError, AttributeError ⇒
- [ ] django/core/handlers/exception.py — shares: TooManyFilesSent, TooManyFieldsSent, MultiPartParserError, RequestDataTooBig, processing, wrap ⇒
- [ ] django/contrib/gis/gdal/layer.py — shares: field_types, force_str, IndexError, field_name, garbage, routine ⇒

## query: django/http/request.py
rare: HTTP_PREFIX, UNPREFIXED_HEADERS, _assert_mutable, _body, _check_data_too_big, _current_scheme_host, _get_full_path, _initialize_handlers

- [ ] django/db/models/fields/__init__.py — shares: __copy__, __deepcopy__, __qualname__, __repr__, KeyError, cached_property ⇒ model fields; dunder names
- [ ] django/db/models/query.py — shares: __deepcopy__, from_iterable, __getitem__, __iter__, __repr__, KeyError ⇒ QuerySet; dunder names
- [x] django/core/handlers/asgi.py — shares: _read_started, _set_content_type_params, _get_scheme, _load_post_and_files, SpooledTemporaryFile, _files ⇒ ASGIRequest subclasses HttpRequest, overrides its privates
- [ ] django/contrib/gis/utils/srs.py — shares: Thus, Exception, hasattr ⇒ unrelated GIS util
- [ ] django/contrib/admin/options.py — shares: BadRequest, parse_qsl, build_absolute_uri, get_full_path, resolver_match, query_string ⇒ generic request-API consumer like every view
- [x] django/core/handlers/wsgi.py — shares: _encoding, _read_started, _set_content_type_params, _get_scheme, _load_post_and_files, _files ⇒ WSGIRequest subclasses HttpRequest, overrides its privates
- [ ] django/core/signals.py — shares: none ⇒ request signals not used by request.py
- [x] django/views/debug.py — shares: _get_raw_host, get_preferred_type, MultiValueDict, get_full_path, path_info, resolver_match ⇒ calls private request._get_raw_host, resolver_match
- [ ] django/db/models/sql/query.py — shares: __deepcopy__, from_iterable, regex_helper, _lazy_re_compile, RuntimeError, __iter__ ⇒ SQL query; generic names
- [x] django/http/response.py — shares: CaseInsensitiveMapping, SEEK_END, get_cookie_signer, __delitem__, DEFAULT_CHARSET, iri_to_uri ⇒ set_signed_cookie pairs get_signed_cookie; same http package
- [ ] django/db/models/base.py — shares: from_iterable, force_str, LookupError, RuntimeError, __qualname__, __repr__ ⇒ model base; generic names
- [ ] django/contrib/admin/static/admin/js/vendor/jquery/jquery.js — shares: Discard, urlencoded, Limit, Attempt, Strip, URI ⇒ vendored jQuery
- [ ] django/conf/global_settings.py — shares: header_value, header_name, FILE_UPLOAD_HANDLERS, USE_X_FORWARDED_HOST, TooManyFilesSent, USE_X_FORWARDED_PORT ⇒ settings registry; defaults only
- [ ] django/forms/widgets.py — shares: list_, __deepcopy__, from_iterable, regex_helper, _lazy_re_compile, __getitem__ ⇒ widgets; generic names
- [ ] django/contrib/auth/migrations/0005_alter_user_last_login_null.py — shares: none ⇒ unrelated migration
- [ ] django/template/base.py — shares: UnicodeDecodeError, regex_helper, _lazy_re_compile, __getitem__, __qualname__, __repr__ ⇒ template engine; generic names
- [ ] django/urls/resolvers.py — shares: MultiValueDict, regex_helper, _lazy_re_compile, __getitem__, __qualname__, __repr__ ⇒ ResolverMatch only assigned onto request; no code dependency
- [x] django/middleware/csrf.py — shares: parse_header_name, header_name, is_same_domain, server_port, HttpHeaders, get_port ⇒ uses HttpHeaders.parse_header_name, UnreadablePostError, get_host
- [ ] django/forms/fields.py — shares: __deepcopy__, BytesIO, regex_helper, _lazy_re_compile, __iter__, content_type ⇒ form fields; generic names
- [x] django/template/defaulttags.py — shares: resolver_match, query_string, QueryDict, __iter__, __qualname__, __repr__ ⇒ querystring tag builds QueryDict, relies on lists/urlencode
- [ ] django/db/models/functions/text.py — shares: Length, ASCII, corresponding, upper, params, lower ⇒ unrelated DB functions
- [x] django/utils/datastructures.py — shares: default_list, CaseInsensitiveMapping, ImmutableList, list_, __copy__, __delitem__ ⇒ MultiValueDict/CaseInsensitiveMapping/ImmutableList bases
- [x] django/utils/http.py — shares: is_same_domain, parse_header_parameters, allowed_hosts, iri_to_uri, MultiValueDict, UnicodeDecodeError ⇒ is_same_domain, parse_header_parameters, iri_to_uri helpers
- [x] django/http/multipartparser.py — shares: _upload_handlers, _encoding, header_name, upload_handlers, _files, _mutable ⇒ parser the request instantiates; TooManyFilesSent re-export
- [ ] django/contrib/gis/db/backends/oracle/operations.py — shares: cached_property, compliant, Length, starts, convert, parser ⇒ unrelated GIS backend
- [ ] django/core/exceptions.py — shares: TooManyFilesSent, DATA_UPLOAD_MAX_NUMBER_FIELDS, TooManyFieldsSent, DisallowedHost, HTTP_HOST, BadRequest ⇒
- [ ] django/core/files/uploadhandler.py — shares: load_handler, SEEK_END, SpooledTemporaryFile, _stream, BytesIO, HttpRequest ⇒
- [ ] django/http/__init__.py — shares: RawPostDataException, HttpHeaders, UnreadablePostError, QueryDict, HttpRequest, cookie ⇒
- [ ] django/core/handlers/exception.py — shares: _mark_post_parse_error, TooManyFilesSent, MultiPartParserError, TooManyFieldsSent, BadRequest, RequestDataTooBig ⇒
- [ ] django/template/context.py — shares: __copy__, __delitem__, __setitem__, __getitem__, RuntimeError, __iter__ ⇒
- [ ] django/utils/connection.py — shares: __delitem__, __setitem__, __getitem__, __iter__, cached_property, AttributeError ⇒

## query: django/utils/module_loading.py
rare: _initializing, before_import_registry, cached_import, full_module_name, importlib_find, module_to_search, package_path, dotted_path

- [ ] django/db/models/sql/query.py — shares: AttributeError, __name__, Decide, forces, initialized, Raise ⇒ SQL query; comment words
- [ ] django/db/models/fields/json.py — shares: paths, present, split, parameter, over, getattr ⇒ unrelated JSON field
- [x] django/core/management/commands/migrate.py — shares: module_has_submodule, get_app_configs, import_module, app_config, Import, importlib ⇒ calls module_has_submodule
- [ ] django/db/models/options.py — shares: import_string, app_config, ImportError, AttributeError, __name__, registry ⇒ generic import_string caller; utility vocabulary
- [ ] django/core/management/commands/shell.py — shares: import_module, import_string, ImportError, INSTALLED_APPS, AttributeError, __name__ ⇒ generic import_string caller
- [x] django/contrib/admin/sites.py — shares: AlreadyRegistered, NotRegistered, _registry, get_app_configs, import_string, app_config ⇒ the register_to/_registry contract autodiscover_modules resets
- [ ] django/core/management/__init__.py — shares: __path__, get_app_configs, import_module, app_config, ImportError, INSTALLED_APPS ⇒ own command discovery; no module_loading use
- [ ] django/apps/registry.py — shares: get_app_configs, app_config, INSTALLED_APPS, __name__, Import, dotted ⇒ delegates to AppConfig.create; no direct use
- [ ] django/utils/translation/trans_real.py — shares: get_app_configs, app_config, __file__, AttributeError, initialized, Raise ⇒ no module_loading use
- [x] django/apps/config.py — shares: module_has_submodule, __path__, import_module, import_string, __file__, ImportError ⇒ calls module_has_submodule and import_string
- [x] django/db/backends/base/creation.py — shares: get_app_configs, import_string, app_config, ImportError, INSTALLED_APPS, modules ⇒ relies on import_string ImportError semantics
- [ ] django/contrib/contenttypes/forms.py — shares: Exception, provide ⇒ unrelated form
- [ ] django/contrib/admin/static/admin/js/vendor/select2/i18n/ja.js — shares: define ⇒ vendored JS
- [ ] django/db/migrations/questioner.py — shares: __path__, import_module, app_config, __file__, ImportError, __name__ ⇒ no module_loading use
- [ ] django/conf/locale/id/formats.py — shares: none ⇒ locale formats
- [ ] django/contrib/admin/options.py — shares: NotRegistered, _registry, module_name, AttributeError, class_name, __name__ ⇒ touches admin _registry, not this module
- [ ] django/template/backends/django.py — shares: module_path, __path__, get_app_configs, import_module, app_config, module_name ⇒ own import_module walk; no module_loading use
- [ ] django/db/migrations/loader.py — shares: ModuleNotFoundError, __path__, get_app_configs, import_module, app_config, __file__ ⇒ own import_module/__path__ logic; no module_loading use
- [ ] django/contrib/admin/checks.py — shares: NotRegistered, import_string, ImportError, INSTALLED_APPS, AttributeError, __name__ ⇒ generic import_string caller
- [ ] django/core/management/templates.py — shares: find_spec, __spec__, __path__, util, bits, importlib ⇒ find_spec directly; no module_loading use
- [ ] django/db/utils.py — shares: __path__, import_module, import_string, app_config, ImportError, AttributeError ⇒ generic import_string caller
- [ ] django/db/models/functions/datetime.py — shares: __name__, copy, Cannot, getattr ⇒ unrelated DB functions
- [ ] django/utils/autoreload.py — shares: __spec__, __file__, ImportError, __name__, spec, directories ⇒ own spec/__file__ handling; no module_loading use
- [ ] django/db/models/base.py — shares: app_config, INSTALLED_APPS, AttributeError, __name__, Auto, initialized ⇒ model base; generic names
- [x] django/db/migrations/writer.py — shares: module_dir, import_module, app_config, ImportError, importlib, register ⇒ calls module_dir
- [ ] django/contrib/admin/exceptions.py — shares: AlreadyRegistered, NotRegistered, Exception ⇒
- [ ] django/urls/utils.py — shares: module_has_submodule, import_module, ImportError, AttributeError, importlib, Convert ⇒
- [ ] django/contrib/admin/__init__.py — shares: autodiscover_modules, register_to, register ⇒
- [ ] django/template/utils.py — shares: get_app_configs, import_string, app_config, rsplit, directories, dirname ⇒
- [ ] django/tasks/base.py — shares: module_path, import_string, ImportError, AttributeError, __name__, Raise ⇒
- [ ] django/contrib/admin/static/admin/js/vendor/jquery/jquery.js — shares: class_name, bubble, discover, forces, spec, err ⇒
- [ ] django/apps/__init__.py — shares: AppConfig, registry ⇒
- [ ] django/core/management/commands/flush.py — shares: get_app_configs, import_module, AppConfig, ImportError, importlib, look ⇒
