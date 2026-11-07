# lexmap relatedness labels
repo: /Users/apple/Documents/APLICATII BIJUTERIE/legacy-codebases/spring-petclinic
identity: HEAD edf4db2, 2 uncommitted entries, inputs sha256:a78476890f4a8c6eaa7a9395d81b6d0c644e304232109eda79673c5ba88f6da2
seed: 1
median-tokens: 49

How to label: for each candidate, would a reviewer of a change in the query file need to open this file to judge the change — because it defines what the query uses, uses what the query defines, or is the other half of the same feature (schema, contract, consumer, sibling implementation)? Mark [x] yes, [ ] no, [?] cannot tell. Sharing only framework vocabulary, or merely sitting in the same layer, is "no". Open the files; the "shares" list is orientation, not evidence. Add a short reason after "⇒".

## query: src/main/java/org/springframework/samples/petclinic/owner/Owner.java
rare: ToStringCreator, compId, compName, equalsIgnoreCase, getAddress, getCity, getTelephone, ignoreNew

- [ ] src/main/java/org/springframework/samples/petclinic/system/CrashController.java — shares: Isvy, Michael, that ⇒
- [ ] src/main/resources/db/postgres/data.sql — shares: owner_id, city, telephone, address ⇒
- [ ] src/main/resources/db/mysql/data.sql — shares: none ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/model/Person.java — shares: getFirstName, NotBlank, getLastName, JavaBean, firstName, constraints ⇒
- [ ] src/main/resources/db/h2/schema.sql — shares: owner_id, city, telephone, address ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Pet.java — shares: CascadeType, OneToMany, OrderBy, FetchType, JoinColumn, addVisit ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/model/BaseEntity.java — shares: isNew, JavaBean, getId, boolean, Integer, Simple ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetValidator.java — shares: isNew, getName, boolean, such, Override, Ken ⇒
- [ ] src/main/resources/messages/messages_fa.properties — shares: addVisit, firstName, invalid, city, telephone, address ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetTypeFormatter.java — shares: getName, Objects, equals, Override, Isvy, Michael ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java — shares: Integer, Brannen, Sam, given, Isvy, Michael ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vets.java — shares: ArrayList, representing, Simple, List, jakarta, domain ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Visit.java — shares: NotBlank, JavaBean, constraints, Column, Table, representing ⇒
- [ ] src/main/resources/messages/messages_de.properties — shares: addVisit, firstName, invalid, city, telephone, address ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java — shares: getLastName, getId, exists, Objects, equals, Integer ⇒
- [ ] src/main/resources/templates/pets/createOrUpdateVisitForm.html — shares: petId, addVisit, firstName, visit, Visit, Owner ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Specialty.java — shares: Table, Entity, persistence, extends, jakarta, Hoeller ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/model/NamedEntity.java — shares: NotBlank, toString, JavaBean, getName, constraints, Column ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetRepository.java — shares: Integer, Brannen, Sam, Isvy, Michael, are ⇒
- [ ] src/main/resources/templates/owners/ownerDetails.html — shares: addVisit, firstName, style, message, visit, Visit ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetController.java — shares: isNew, getPet, addPet, petId, getId, getName ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/VisitController.java — shares: getPet, petId, addVisit, Isvy, Michael, message ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vet.java — shares: FetchType, JoinColumn, JavaBean, getName, EAGER, fetch ⇒
- [ ] src/main/resources/messages/messages.properties — shares: addVisit, firstName, must, Visit, invalid, Owner ⇒
- [ ] src/main/resources/messages/messages_es.properties — shares: addVisit, firstName, invalid, city, telephone, address ⇒

## query: src/main/java/org/springframework/samples/petclinic/owner/PetTypeFormatter.java
rare: PropertyEditors, ParseException, PetTypeFormatter, petType, PetTypeRepository, findPetTypes, getName, PetType

- [ ] src/main/java/org/springframework/samples/petclinic/model/BaseEntity.java — shares: implements, Hoeller, Juergen, null ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/model/NamedEntity.java — shares: getName, Override, Hoeller, Juergen, null ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/system/WelcomeController.java — shares: stereotype ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java — shares: Objects, equals, stereotype, Isvy, Michael, The ⇒
- [ ] gradlew — shares: links, details, have, parse, format, The ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetController.java — shares: Fisher, Mark, stereotype, final, Hoeller, Juergen ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetType.java — shares: PetType, types, Hoeller, Juergen ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Visit.java — shares: current, format ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/system/CrashController.java — shares: how, throw, stereotype, Isvy, Michael ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetController.java — shares: PetTypeRepository, findPetTypes, getName, PetType, Objects, details ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vet.java — shares: getName, Hoeller, Juergen, null ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Specialty.java — shares: Hoeller, Juergen ⇒
- [ ] src/main/resources/static/resources/css/petclinic.css — shares: print, details, format, The ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetRepository.java — shares: reference, current, docs, Collection, Isvy, Michael ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Pet.java — shares: PetType, Collection, format, final, Hoeller, Juergen ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Owner.java — shares: getName, Objects, equals, Override, Isvy, Michael ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/VisitController.java — shares: MVC, throw, have, stereotype, Isvy, Michael ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/system/WebConfiguration.java — shares: locale, Locale, implements, Override ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/system/CacheConfiguration.java — shares: The ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java — shares: reference, current, docs, Collection, Isvy, Michael ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetValidator.java — shares: getName, implements, Override, final, Hoeller, Juergen ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/model/package-info.java — shares: The ⇒
- [ ] mvnw.cmd — shares: more, The, from, found, null ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetTypeRepository.java — shares: PetTypeRepository, findPetTypes, PetType, Collection, from ⇒
- [ ] mvnw — shares: parse, more, format, throws, The, from ⇒

## query: src/main/java/org/springframework/samples/petclinic/owner/PetTypeRepository.java
rare: JpaRepository, PetTypeRepository, findPetTypes, PetType, Baumgartner, ORDER, Patrick, Query

- [ ] build.gradle — shares: jpa, data ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/system/CacheConfiguration.java — shares: none ⇒
- [ ] src/main/resources/db/h2/data.sql — shares: none ⇒
- [ ] src/main/resources/db/postgres/data.sql — shares: SELECT, FROM ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java — shares: JpaRepository, Retrieve, interface, Repository, store, repository ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Visit.java — shares: extends, domain ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetController.java — shares: PetTypeRepository, findPetTypes, PetType, Integer, Collection ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Owner.java — shares: Integer, List, extends, domain, link ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/model/NamedEntity.java — shares: objects, code, extends, domain ⇒
- [ ] src/main/resources/application.properties — shares: jpa, data ⇒
- [ ] src/main/resources/db/postgres/schema.sql — shares: none ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/model/BaseEntity.java — shares: objects, Integer, domain ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Pet.java — shares: PetType, Collection, extends ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/system/WebConfiguration.java — shares: code, link ⇒
- [ ] src/main/resources/templates/fragments/layout.html — shares: all, data, link ⇒
- [ ] src/main/resources/static/resources/css/petclinic.css — shares: all, code, data, link ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vet.java — shares: List, extends, domain ⇒
- [ ] gradlew — shares: all, from, link ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetType.java — shares: PetType, extends ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vets.java — shares: List, domain, link ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java — shares: Integer, all, List, data, domain ⇒
- [ ] pom.xml — shares: store, jpa, data ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetController.java — shares: objects, List, data, domain ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetRepository.java — shares: Retrieve, interface, Repository, store, repository, objects ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetTypeFormatter.java — shares: PetTypeRepository, findPetTypes, PetType, Collection, from ⇒

## query: src/main/java/org/springframework/samples/petclinic/owner/PetValidator.java
rare: isAssignableFrom, StringUtils, hasText, PetValidator, getBirthDate, rejectValue, getType, isNew

- [ ] src/main/java/org/springframework/samples/petclinic/model/package-info.java — shares: none ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetTypeFormatter.java — shares: getName, implements, Override, final, Hoeller, Juergen ⇒
- [ ] src/main/resources/messages/messages_de.properties — shares: birthDate, here, date ⇒
- [ ] pom.xml — shares: validate, using, Java, This, validation ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java — shares: rejectValue, Ken, Krebs, validation, final, Hoeller ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/model/BaseEntity.java — shares: isNew, boolean, implements, Ken, Krebs, Hoeller ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/VisitController.java — shares: Object, Ken, Krebs, validation, Pet, final ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/model/NamedEntity.java — shares: getName, Override, code, Ken, Krebs, validation ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Owner.java — shares: isNew, getName, boolean, such, Override, Ken ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Specialty.java — shares: Hoeller, Juergen ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/system/WebConfiguration.java — shares: Bean, implements, Override, using, code ⇒
- [ ] src/main/resources/db/mysql/data.sql — shares: none ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetController.java — shares: Object, Ken, Krebs, final, Hoeller, Juergen ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Pet.java — shares: getBirthDate, getType, birthDate, Ken, Krebs, Pet ⇒
- [ ] src/main/resources/templates/owners/ownerDetails.html — shares: birthDate, Pet, date ⇒
- [ ] src/main/resources/templates/pets/createOrUpdateVisitForm.html — shares: birthDate, Pet, date ⇒
- [ ] gradlew — shares: because, such, here, Java, This, null ⇒
- [ ] src/main/resources/templates/pets/createOrUpdatePetForm.html — shares: birthDate, Pet, date ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetController.java — shares: StringUtils, hasText, PetValidator, getBirthDate, rejectValue, getType ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java — shares: This, code, Ken, Krebs, Hoeller, Juergen ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetRepository.java — shares: code, Ken, Krebs, Hoeller, Juergen ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vet.java — shares: getName, Ken, Krebs, Hoeller, Juergen, null ⇒
- [ ] src/main/resources/messages/messages.properties — shares: birthDate, Pet, date ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/system/WelcomeController.java — shares: none ⇒
- [ ] mvnw — shares: such, validate, using, Java, validation, null ⇒

## query: src/main/java/org/springframework/samples/petclinic/system/CrashController.java
rare: triggerException, CrashController, RuntimeException, GetMapping, resolves, Also, added, Expected

- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java — shares: GetMapping, Controller, stereotype, Isvy, Michael, view ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java — shares: Isvy, Michael ⇒
- [ ] mvnw — shares: when, has ⇒
- [ ] src/main/resources/db/mysql/schema.sql — shares: none ⇒
- [ ] src/main/scss/petclinic.scss — shares: view, error ⇒
- [ ] gradlew — shares: see, when, that, has ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Owner.java — shares: Isvy, Michael, that ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetController.java — shares: GetMapping, Controller, stereotype, bind, web ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetRepository.java — shares: Isvy, Michael ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetTypeFormatter.java — shares: how, throw, stereotype, Isvy, Michael ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/system/WebConfiguration.java — shares: added, system, that, web ⇒
- [ ] src/main/resources/application.properties — shares: view, web ⇒
- [ ] pom.xml — shares: used, bind, has ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/model/BaseEntity.java — shares: none ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/model/package-info.java — shares: used ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vets.java — shares: used, view, bind, web ⇒
- [ ] src/main/resources/static/resources/css/petclinic.css — shares: view, system, has, error ⇒
- [ ] src/main/resources/templates/fragments/layout.html — shares: RuntimeException, oups, how, see, error ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/system/WelcomeController.java — shares: GetMapping, Controller, stereotype, bind, system, web ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Visit.java — shares: none ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetController.java — shares: GetMapping, Controller, been, stereotype, bind, web ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/VisitController.java — shares: GetMapping, throw, Controller, been, stereotype, Isvy ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/system/CacheConfiguration.java — shares: used, system, that ⇒
- [ ] src/main/resources/messages/messages.properties — shares: been, has, error ⇒
- [ ] src/main/resources/db/mysql/user.sql — shares: none ⇒

## query: src/main/java/org/springframework/samples/petclinic/vet/VetController.java
rare: ResponseBody, addAll, findPaginated, showVetList, vetRepository, PageRequest, RequestParam, VetController

- [ ] src/main/resources/templates/owners/ownersList.html — shares: currentPage, totalPages, page ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetController.java — shares: GetMapping, Arjen, Controller, Poutsma, stereotype, bind ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Visit.java — shares: Ken, Krebs, domain, object ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Specialty.java — shares: Vet, vet, Hoeller, Juergen ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/model/Person.java — shares: Ken, Krebs, domain, object ⇒
- [ ] src/main/resources/templates/vets/vetList.html — shares: listVets, currentPage, totalPages, vet, page ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/model/BaseEntity.java — shares: objects, Ken, Krebs, Hoeller, Juergen, domain ⇒
- [ ] src/main/resources/db/h2/data.sql — shares: none ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vets.java — shares: getVetList, Vets, Arjen, Poutsma, Vet, bind ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java — shares: returning, pageable, objects, Page, Pageable, are ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/system/WelcomeController.java — shares: GetMapping, Controller, stereotype, bind, web ⇒
- [ ] src/main/resources/db/mysql/data.sql — shares: none ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetTypeFormatter.java — shares: Fisher, Mark, stereotype, final, Hoeller, Juergen ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetValidator.java — shares: Object, Ken, Krebs, final, Hoeller, Juergen ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java — shares: PageRequest, RequestParam, addAttribute, addPaginationModel, defaultValue, getContent ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Owner.java — shares: are, List, Ken, Krebs, final, Hoeller ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/VisitController.java — shares: GetMapping, Arjen, Controller, Poutsma, stereotype, Object ⇒
- [ ] src/main/resources/db/mysql/schema.sql — shares: none ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/model/NamedEntity.java — shares: objects, Ken, Krebs, Hoeller, Juergen, domain ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/PetTypeRepository.java — shares: objects, List, data, domain ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/Vet.java — shares: toList, Arjen, Poutsma, Vet, bind, List ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/owner/Pet.java — shares: Ken, Krebs, final, Hoeller, Juergen, object ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/system/CrashController.java — shares: GetMapping, Controller, stereotype, bind, web ⇒
- [ ] src/main/java/org/springframework/samples/petclinic/vet/VetRepository.java — shares: VetRepository, findAll, pageable, objects, Page, Pageable ⇒
- [ ] pom.xml — shares: mapping, bind, data ⇒
