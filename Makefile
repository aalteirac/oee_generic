snow_conn_name = COLLAPP
snow_role= ACCOUNTADMIN

set-db:
	snow sql -q "CREATE DATABASE IF NOT EXISTS OEE_APP;"	 --connection ${snow_conn_name} --role ${snow_role}
	snow sql -q "CREATE SCHEMA IF NOT EXISTS OEE_APP.DEVOPS;"	 --connection ${snow_conn_name} --role ${snow_role}
	snow sql -q "CREATE IMAGE REPOSITORY IF NOT EXISTS OEE_APP.DEVOPS.IMG;"	 --connection ${snow_conn_name} --role ${snow_role}

repo-login:
	snow spcs image-registry login --connection ${snow_conn_name} 

build:
	$(eval frontbackend_tag := oee_frontbackend:latest)
	$(eval repository_url := $(shell snow spcs image-repository url OEE_APP.DEVOPS.IMG --connection ${snow_conn_name}))
	docker build --platform=linux/amd64 -t oee_frontbackend .
	docker tag oee_frontbackend ${repository_url}/${frontbackend_tag}

push:
	$(eval frontbackend_tag := oee_frontbackend:latest)
	$(eval repository_url := $(shell snow spcs image-repository url OEE_APP.DEVOPS.IMG --connection ${snow_conn_name}))
	docker push ${repository_url}/${frontbackend_tag}

nat:
	snow app run --role ${snow_role} --force --no-interactive --connection ${snow_conn_name}

clean-nat:
	snow app teardown --force --no-interactive --cascade




all-scratch:
	$(MAKE) set-db clean-nat repo-login build push nat

all: 
	$(MAKE) set-db repo-login build push nat








