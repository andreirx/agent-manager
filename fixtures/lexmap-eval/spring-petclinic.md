# lexmap relatedness labels
repo: /Users/apple/Documents/APLICATII BIJUTERIE/legacy-codebases/spring-petclinic
identity: HEAD edf4db2, 2 uncommitted entries, inputs sha256:a78476890f4a8c6eaa7a9395d81b6d0c644e304232109eda79673c5ba88f6da2
seed: 1
median-tokens: 49

How to label: for each candidate, would a reviewer of a change in the query file need to open this file to judge the change — because it defines what the query uses, uses what the query defines, or is the other half of the same feature (schema, contract, consumer, sibling implementation)? Mark [x] yes, [ ] no, [?] cannot tell. Sharing only framework vocabulary, or merely sitting in the same layer, is "no". Open the files; the "shares" list is orientation, not evidence. Add a short reason after "⇒".

## query: src/main/java/org/springframework/samples/petclinic/owner/Owner.java
rare: ToStringCreator, compId, compName, equalsIgnoreCase, getAddress, getCity, getTelephone, ignoreNew

- [ ] src/main/java/org/springframework/samples/petclinic/system/CrashController.java — shares: Isvy, Michael, that ⇒ unrelated demo controller; shares only author names
- [x] src/main/resources/db/postgres/data.sql — shares: owner_id, city, telephone, address ⇒ seed rows for the owners table; column change mirrored here
- [x] src/main/resources/db/mysql/data.sql — shares: none ⇒ positional seed rows for owners; column change breaks them
- [x] src/main/java/org/springframework/samples/petclinic/model/Person.java — shares: getFirstName, NotBlank, getLastName, JavaBean, firstName, constraints ⇒ direct superclass; defines firstName/lastName Owner uses
- [x] src/main/resources/db/h2/schema.sql — shares: owner_id, city, telephone, address ⇒ owners table and pets.owner_id the entity maps to
- [x] src/main/java/org/springframework/samples/petclinic/owner/Pet.java — shares: CascadeType, OneToMany, OrderBy, FetchType, JoinColumn, addVisit ⇒ the owned entity; getPet/addVisit call its API
- [x] src/main/java/org/springframework/samples/petclinic/model/BaseEntity.java — shares: isNew, JavaBean, getId, boolean, Integer, Simple ⇒ defines isNew/getId used throughout Owner
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetValidator.java — shares: isNew, getName, boolean, such, Override, Ken ⇒ validates Pet only; never touches Owner
- [ ] src/main/resources/messages/messages_fa.properties — shares: addVisit, firstName, invalid, city, telephone, address ⇒ translation mirror; default bundle holds the contract
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetTypeFormatter.java — shares: getName, Objects, equals, Override, Isvy, Michael ⇒ formats PetType; no Owner interaction
- [x] src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java — shares: Integer, Brannen, Sam, given, Isvy, Michael ⇒ repository of Owner; derived query on lastName
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vets.java — shares: ArrayList, representing, Simple, List, jakarta, domain ⇒ vet wrapper; no link to Owner
- [x] src/main/java/org/springframework/samples/petclinic/owner/Visit.java — shares: NotBlank, JavaBean, constraints, Column, Table, representing ⇒ parameter type of Owner.addVisit
- [ ] src/main/resources/messages/messages_de.properties — shares: addVisit, firstName, invalid, city, telephone, address ⇒ translation mirror; default bundle holds the contract
- [x] src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java — shares: getLastName, getId, exists, Objects, equals, Integer ⇒ primary consumer; binds, saves, reads Owner
- [ ] src/main/resources/templates/pets/createOrUpdateVisitForm.html — shares: petId, addVisit, firstName, visit, Visit, Owner ⇒ renders only inherited name fields of owner
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Specialty.java — shares: Table, Entity, persistence, extends, jakarta, Hoeller ⇒ vet-side entity; JPA vocabulary only
- [ ] src/main/java/org/springframework/samples/petclinic/model/NamedEntity.java — shares: NotBlank, toString, JavaBean, getName, constraints, Column ⇒ Pet's superclass, not Owner's; indirect only
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetRepository.java — shares: Integer, Brannen, Sam, Isvy, Michael, are ⇒ vet repository; no Owner interaction
- [x] src/main/resources/templates/owners/ownerDetails.html — shares: addVisit, firstName, style, message, visit, Visit ⇒ renders address/city/telephone/pets of Owner
- [x] src/main/java/org/springframework/samples/petclinic/owner/PetController.java — shares: isNew, getPet, addPet, petId, getId, getName ⇒ consumer of addPet/getPet overloads
- [x] src/main/java/org/springframework/samples/petclinic/owner/VisitController.java — shares: getPet, petId, addVisit, Isvy, Michael, message ⇒ consumer of getPet(Integer) and addVisit
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vet.java — shares: FetchType, JoinColumn, JavaBean, getName, EAGER, fetch ⇒ sibling Person subclass; no interaction
- [x] src/main/resources/messages/messages.properties — shares: addVisit, firstName, must, Visit, invalid, Owner ⇒ defines telephone.invalid key Owner's @Pattern references
- [ ] src/main/resources/messages/messages_es.properties — shares: addVisit, firstName, invalid, city, telephone, address ⇒ translation mirror; default bundle holds the contract

## query: src/main/java/org/springframework/samples/petclinic/owner/PetTypeFormatter.java
rare: PropertyEditors, ParseException, PetTypeFormatter, petType, PetTypeRepository, findPetTypes, getName, PetType

- [ ] src/main/java/org/springframework/samples/petclinic/model/BaseEntity.java — shares: implements, Hoeller, Juergen, null ⇒ formatter never uses id/isNew
- [x] src/main/java/org/springframework/samples/petclinic/model/NamedEntity.java — shares: getName, Override, Hoeller, Juergen, null ⇒ defines getName the formatter prints and matches
- [ ] src/main/java/org/springframework/samples/petclinic/system/WelcomeController.java — shares: stereotype ⇒ unrelated controller
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java — shares: Objects, equals, stereotype, Isvy, Michael, The ⇒ binds Owner, which has no PetType field
- [ ] gradlew — shares: links, details, have, parse, format, The ⇒ build wrapper script
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetController.java — shares: Fisher, Mark, stereotype, final, Hoeller, Juergen ⇒ unrelated controller
- [x] src/main/java/org/springframework/samples/petclinic/owner/PetType.java — shares: PetType, types, Hoeller, Juergen ⇒ the entity the formatter parses and prints
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Visit.java — shares: current, format ⇒ unrelated entity
- [ ] src/main/java/org/springframework/samples/petclinic/system/CrashController.java — shares: how, throw, stereotype, Isvy, Michael ⇒ unrelated demo controller
- [x] src/main/java/org/springframework/samples/petclinic/owner/PetController.java — shares: PetTypeRepository, findPetTypes, getName, PetType, Objects, details ⇒ binds Pet.type via this formatter; supplies types
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vet.java — shares: getName, Hoeller, Juergen, null ⇒ vet entity; no link
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Specialty.java — shares: Hoeller, Juergen ⇒ sibling NamedEntity; no link
- [ ] src/main/resources/static/resources/css/petclinic.css — shares: print, details, format, The ⇒ stylesheet
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetRepository.java — shares: reference, current, docs, Collection, Isvy, Michael ⇒ vet repository; no link
- [x] src/main/java/org/springframework/samples/petclinic/owner/Pet.java — shares: PetType, Collection, format, final, Hoeller, Juergen ⇒ holds the PetType field the formatter converts
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Owner.java — shares: getName, Objects, equals, Override, Isvy, Michael ⇒ no PetType usage
- [ ] src/main/java/org/springframework/samples/petclinic/owner/VisitController.java — shares: MVC, throw, have, stereotype, Isvy, Michael ⇒ binds Visit; no type conversion
- [ ] src/main/java/org/springframework/samples/petclinic/system/WebConfiguration.java — shares: locale, Locale, implements, Override ⇒ does not register formatters; locale only
- [ ] src/main/java/org/springframework/samples/petclinic/system/CacheConfiguration.java — shares: The ⇒ vets cache config
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java — shares: reference, current, docs, Collection, Isvy, Michael ⇒ owner repository; no link
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetValidator.java — shares: getName, implements, Override, final, Hoeller, Juergen ⇒ checks type null after binding; no direct link
- [ ] src/main/java/org/springframework/samples/petclinic/model/package-info.java — shares: The ⇒ package doc only
- [ ] mvnw.cmd — shares: more, The, from, found, null ⇒ build wrapper script
- [x] src/main/java/org/springframework/samples/petclinic/owner/PetTypeRepository.java — shares: PetTypeRepository, findPetTypes, PetType, Collection, from ⇒ injected dependency; findPetTypes feeds parse
- [ ] mvnw — shares: parse, more, format, throws, The, from ⇒ build wrapper script

## query: src/main/java/org/springframework/samples/petclinic/owner/PetTypeRepository.java
rare: JpaRepository, PetTypeRepository, findPetTypes, PetType, Baumgartner, ORDER, Patrick, Query

- [ ] build.gradle — shares: jpa, data ⇒ dependency declarations only
- [ ] src/main/java/org/springframework/samples/petclinic/system/CacheConfiguration.java — shares: none ⇒ vets cache; types not cached
- [ ] src/main/resources/db/h2/data.sql — shares: none ⇒ seed rows; JPQL shape unaffected
- [ ] src/main/resources/db/postgres/data.sql — shares: SELECT, FROM ⇒ seed rows; JPQL shape unaffected
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java — shares: JpaRepository, Retrieve, interface, Repository, store, repository ⇒ sibling repository; nothing to mirror
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Visit.java — shares: extends, domain ⇒ unrelated entity
- [x] src/main/java/org/springframework/samples/petclinic/owner/PetController.java — shares: PetTypeRepository, findPetTypes, PetType, Integer, Collection ⇒ consumer; populates types via findPetTypes
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Owner.java — shares: Integer, List, extends, domain, link ⇒ no PetType usage
- [x] src/main/java/org/springframework/samples/petclinic/model/NamedEntity.java — shares: objects, code, extends, domain ⇒ defines the name field the JPQL orders by
- [ ] src/main/resources/application.properties — shares: jpa, data ⇒ generic JPA settings
- [ ] src/main/resources/db/postgres/schema.sql — shares: none ⇒ JPQL targets the entity, not the DDL
- [ ] src/main/java/org/springframework/samples/petclinic/model/BaseEntity.java — shares: objects, Integer, domain ⇒ id type only; not exercised
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Pet.java — shares: PetType, Collection, extends ⇒ holds PetType but never calls the repo
- [ ] src/main/java/org/springframework/samples/petclinic/system/WebConfiguration.java — shares: code, link ⇒ locale config
- [ ] src/main/resources/templates/fragments/layout.html — shares: all, data, link ⇒ page chrome
- [ ] src/main/resources/static/resources/css/petclinic.css — shares: all, code, data, link ⇒ stylesheet
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vet.java — shares: List, extends, domain ⇒ vet entity
- [ ] gradlew — shares: all, from, link ⇒ build wrapper script
- [x] src/main/java/org/springframework/samples/petclinic/owner/PetType.java — shares: PetType, extends ⇒ the managed entity of this repository
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vets.java — shares: List, domain, link ⇒ vet wrapper
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java — shares: Integer, all, List, data, domain ⇒ uses OwnerRepository only
- [ ] pom.xml — shares: store, jpa, data ⇒ dependency declarations only
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetController.java — shares: objects, List, data, domain ⇒ uses VetRepository only
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetRepository.java — shares: Retrieve, interface, Repository, store, repository, objects ⇒ sibling repository; different base type
- [x] src/main/java/org/springframework/samples/petclinic/owner/PetTypeFormatter.java — shares: PetTypeRepository, findPetTypes, PetType, Collection, from ⇒ consumer; parse iterates findPetTypes

## query: src/main/java/org/springframework/samples/petclinic/owner/PetValidator.java
rare: isAssignableFrom, StringUtils, hasText, PetValidator, getBirthDate, rejectValue, getType, isNew

- [ ] src/main/java/org/springframework/samples/petclinic/model/package-info.java — shares: none ⇒ package doc only
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetTypeFormatter.java — shares: getName, implements, Override, final, Hoeller, Juergen ⇒ converts type before validation; no direct link
- [ ] src/main/resources/messages/messages_de.properties — shares: birthDate, here, date ⇒ translation mirror of required key
- [ ] pom.xml — shares: validate, using, Java, This, validation ⇒ dependency declarations only
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java — shares: rejectValue, Ken, Krebs, validation, final, Hoeller ⇒ validates Owner; never registers PetValidator
- [x] src/main/java/org/springframework/samples/petclinic/model/BaseEntity.java — shares: isNew, boolean, implements, Ken, Krebs, Hoeller ⇒ defines isNew gating the type check
- [ ] src/main/java/org/springframework/samples/petclinic/owner/VisitController.java — shares: Object, Ken, Krebs, validation, Pet, final ⇒ reads Pet but does not validate it
- [x] src/main/java/org/springframework/samples/petclinic/model/NamedEntity.java — shares: getName, Override, code, Ken, Krebs, validation ⇒ defines the name field being validated
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Owner.java — shares: isNew, getName, boolean, such, Override, Ken ⇒ not validated by this class
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Specialty.java — shares: Hoeller, Juergen ⇒ vet entity
- [ ] src/main/java/org/springframework/samples/petclinic/system/WebConfiguration.java — shares: Bean, implements, Override, using, code ⇒ locale config
- [ ] src/main/resources/db/mysql/data.sql — shares: none ⇒ seed rows
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetController.java — shares: Object, Ken, Krebs, final, Hoeller, Juergen ⇒ unrelated controller
- [x] src/main/java/org/springframework/samples/petclinic/owner/Pet.java — shares: getBirthDate, getType, birthDate, Ken, Krebs, Pet ⇒ the validated class; getType/getBirthDate
- [ ] src/main/resources/templates/owners/ownerDetails.html — shares: birthDate, Pet, date ⇒ read-only display; no validation errors shown
- [ ] src/main/resources/templates/pets/createOrUpdateVisitForm.html — shares: birthDate, Pet, date ⇒ visit form; binds Visit not Pet
- [ ] gradlew — shares: because, such, here, Java, This, null ⇒ build wrapper script
- [x] src/main/resources/templates/pets/createOrUpdatePetForm.html — shares: birthDate, Pet, date ⇒ the form whose name/birthDate/type fields get rejected
- [x] src/main/java/org/springframework/samples/petclinic/owner/PetController.java — shares: StringUtils, hasText, PetValidator, getBirthDate, rejectValue, getType ⇒ registers the validator; overlapping birthDate checks
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java — shares: This, code, Ken, Krebs, Hoeller, Juergen ⇒ repository; no link
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetRepository.java — shares: code, Ken, Krebs, Hoeller, Juergen ⇒ repository; no link
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vet.java — shares: getName, Ken, Krebs, Hoeller, Juergen, null ⇒ vet entity
- [x] src/main/resources/messages/messages.properties — shares: birthDate, Pet, date ⇒ defines required error code the validator emits
- [ ] src/main/java/org/springframework/samples/petclinic/system/WelcomeController.java — shares: none ⇒ unrelated controller
- [ ] mvnw — shares: such, validate, using, Java, validation, null ⇒ build wrapper script

## query: src/main/java/org/springframework/samples/petclinic/system/CrashController.java
rare: triggerException, CrashController, RuntimeException, GetMapping, resolves, Also, added, Expected

- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java — shares: GetMapping, Controller, stereotype, Isvy, Michael, view ⇒ same layer; no interaction
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java — shares: Isvy, Michael ⇒ author names only
- [ ] mvnw — shares: when, has ⇒ build wrapper script
- [ ] src/main/resources/db/mysql/schema.sql — shares: none ⇒ DDL
- [ ] src/main/scss/petclinic.scss — shares: view, error ⇒ styles the error page, not the trigger
- [ ] gradlew — shares: see, when, that, has ⇒ build wrapper script
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Owner.java — shares: Isvy, Michael, that ⇒ author names only
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetController.java — shares: GetMapping, Controller, stereotype, bind, web ⇒ same layer; no interaction
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetRepository.java — shares: Isvy, Michael ⇒ author names only
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetTypeFormatter.java — shares: how, throw, stereotype, Isvy, Michael ⇒ unrelated
- [ ] src/main/java/org/springframework/samples/petclinic/system/WebConfiguration.java — shares: added, system, that, web ⇒ locale config; no error handling
- [ ] src/main/resources/application.properties — shares: view, web ⇒ no error-path settings
- [ ] pom.xml — shares: used, bind, has ⇒ dependency declarations only
- [ ] src/main/java/org/springframework/samples/petclinic/model/BaseEntity.java — shares: none ⇒ unrelated
- [ ] src/main/java/org/springframework/samples/petclinic/model/package-info.java — shares: used ⇒ package doc only
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vets.java — shares: used, view, bind, web ⇒ unrelated
- [ ] src/main/resources/static/resources/css/petclinic.css — shares: view, system, has, error ⇒ compiled stylesheet
- [x] src/main/resources/templates/fragments/layout.html — shares: RuntimeException, oups, how, see, error ⇒ nav menu links /oups; the endpoint's only caller
- [ ] src/main/java/org/springframework/samples/petclinic/system/WelcomeController.java — shares: GetMapping, Controller, stereotype, bind, system, web ⇒ sibling trivial controller; nothing to mirror
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Visit.java — shares: none ⇒ unrelated
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetController.java — shares: GetMapping, Controller, been, stereotype, bind, web ⇒ same layer; no interaction
- [ ] src/main/java/org/springframework/samples/petclinic/owner/VisitController.java — shares: GetMapping, throw, Controller, been, stereotype, Isvy ⇒ same layer; no interaction
- [ ] src/main/java/org/springframework/samples/petclinic/system/CacheConfiguration.java — shares: used, system, that ⇒ same package only
- [ ] src/main/resources/messages/messages.properties — shares: been, has, error ⇒ menu label keys; not referenced by controller
- [ ] src/main/resources/db/mysql/user.sql — shares: none ⇒ DB user setup
- [ ] src/main/java/org/springframework/samples/petclinic/system/package-info.java — shares: system ⇒ bare package declaration; same package, no interaction

## query: src/main/java/org/springframework/samples/petclinic/vet/VetController.java
rare: ResponseBody, addAll, findPaginated, showVetList, vetRepository, PageRequest, RequestParam, VetController

- [ ] src/main/resources/templates/owners/ownersList.html — shares: currentPage, totalPages, page ⇒ owner list view; fed by OwnerController
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetController.java — shares: GetMapping, Arjen, Controller, Poutsma, stereotype, bind ⇒ same layer; no interaction
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Visit.java — shares: Ken, Krebs, domain, object ⇒ unrelated entity
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Specialty.java — shares: Vet, vet, Hoeller, Juergen ⇒ reached via Vet only; controller never touches
- [ ] src/main/java/org/springframework/samples/petclinic/model/Person.java — shares: Ken, Krebs, domain, object ⇒ Vet superclass; controller uses no fields
- [x] src/main/resources/templates/vets/vetList.html — shares: listVets, currentPage, totalPages, vet, page ⇒ the view consuming listVets and page model
- [ ] src/main/java/org/springframework/samples/petclinic/model/BaseEntity.java — shares: objects, Ken, Krebs, Hoeller, Juergen, domain ⇒ not exercised by controller
- [ ] src/main/resources/db/h2/data.sql — shares: none ⇒ seed rows
- [x] src/main/java/org/springframework/samples/petclinic/vet/Vets.java — shares: getVetList, Vets, Arjen, Poutsma, Vet, bind ⇒ wrapper built and returned by both handlers
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java — shares: returning, pageable, objects, Page, Pageable, are ⇒ owner repository; not used here
- [ ] src/main/java/org/springframework/samples/petclinic/system/WelcomeController.java — shares: GetMapping, Controller, stereotype, bind, web ⇒ unrelated controller
- [ ] src/main/resources/db/mysql/data.sql — shares: none ⇒ seed rows
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetTypeFormatter.java — shares: Fisher, Mark, stereotype, final, Hoeller, Juergen ⇒ unrelated
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetValidator.java — shares: Object, Ken, Krebs, final, Hoeller, Juergen ⇒ unrelated
- [x] src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java — shares: PageRequest, RequestParam, addAttribute, addPaginationModel, defaultValue, getContent ⇒ duplicated pagination logic a change should mirror
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Owner.java — shares: are, List, Ken, Krebs, final, Hoeller ⇒ unrelated entity
- [ ] src/main/java/org/springframework/samples/petclinic/owner/VisitController.java — shares: GetMapping, Arjen, Controller, Poutsma, stereotype, Object ⇒ same layer; no interaction
- [ ] src/main/resources/db/mysql/schema.sql — shares: none ⇒ DDL
- [ ] src/main/java/org/springframework/samples/petclinic/model/NamedEntity.java — shares: objects, Ken, Krebs, Hoeller, Juergen, domain ⇒ not exercised by controller
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetTypeRepository.java — shares: objects, List, data, domain ⇒ owner-side repository
- [x] src/main/java/org/springframework/samples/petclinic/vet/Vet.java — shares: toList, Arjen, Poutsma, Vet, bind, List ⇒ the entity paged and listed
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Pet.java — shares: Ken, Krebs, final, Hoeller, Juergen, object ⇒ unrelated entity
- [ ] src/main/java/org/springframework/samples/petclinic/system/CrashController.java — shares: GetMapping, Controller, stereotype, bind, web ⇒ unrelated controller
- [x] src/main/java/org/springframework/samples/petclinic/vet/VetRepository.java — shares: VetRepository, findAll, pageable, objects, Page, Pageable ⇒ injected dependency; both findAll overloads called
- [ ] pom.xml — shares: mapping, bind, data ⇒ dependency declarations only
