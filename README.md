# TODO
- <del> OK Find front framework for POC </del>
- <del> OK Bundle front + back with express </del>
- <del> OK Dockerize </del>
- <del> OK CI/CD for Native App + SPCS </del>
- <del> OK Clean the code/organise well, cause it's messy! </del>
- <del> OK Live reload for full stack </del>
- <del> OK Prepare snowflake connectivity with key pair </del>
- <del> OK Set all auth info as env </del>
- <del> OK Prepare dual auth for regular app and Native app </del>
- <del> OK Cortex API backend Auth for Managed App </del>
- <del> OK Cortex API backend Auth for Native App </del>
- <del> OK Cortex API backend Auth auto detect deployment </del>
- <del> OK Cortex Semantic model on the fly </del>
- <del> OK Prep for chat in frontend </del>
- <del> OK Fix Snow connection renewal </del>
- <del> OK Disable chart when query retrun nothing...</del>
- <del> OK Plug Cortex on partner data</del>
- <del> OK Define queries for dashboard </del>
- <del> OK Prepare a single table for easier cortex analyst implementation</del>
- <del> OK Cortex async to investigate for long running task (non blocking)</del>
- <del> OK Manage chart text depending on Dark/Light theme</del>
- <del> OK Add privileges for snowflake DB, missing functions otherwise</del>
- <del> OK Optimize docker image size</del>
- <del> OK Add date filter on the dashboard</del>
- <del> OK Changing to Streaming for a far far better UX</del>
- <del> OK Auto charting</del>
- <del> OK Style auto charts for dark/light</del>
- <del> OK Fix Apex export menu style</del>
- <del> OK Change Data Table for a paginated and sortable one</del>
- <del> OK Websocket replace broadcast</del> 
- <del> OK Make Semantic model editable from the UI</del>
- <del> Fix Open History dsabled after navigation despite there are some...</del>
- Fix talk to data
- Customize Error message on the chat
- Cortex from SPCS is BUGGGYYY
- Limit data size for SQL answer, do not do chart, limit data table
- Add BIN button on questions in the history
- Get Michael's advices for a better dashboard


---

# PRE-REQ

- Docker
- Nodejs >22
- Snowflake CLI installed ==> [DOC](https://docs.snowflake.com/en/developer-guide/snowflake-cli/index)

If you need to run as Managed (or Connected) application (ie, you're not deploying as a Native Application)

- Snowflake user with key pair auth for the container to connect Snowflake when running regular docker ==> [DOC](https://docs.snowflake.com/en/user-guide/key-pair-auth)
- Drop the generated private and public keys in the 'secrets' directory => rsa_key.p8 and rsa_key.pub KEEP THE NAME INTACT
- Rename .env_sample to .env and update for connection info

---

Create the warehouse (OEE_NATIVE_WH) and sample DB if you don't want to adjust the code.

```console
CREATE DATABASE IF NOT EXISTS IE;
```

Import the oee.csv in a table named PRODUCTION_DATA in PUBLIC schema

---
# Installl libs 

```console
npm i -g nodemon 
npm i
```

---

# DEV preview build static and launch back + front

Live backend
```console
npm run live
```
and when the front is modified
```console
npm run build
```

No live modification
```console
npm run launch
```

---

# Deploy as Native App (Optional)

Modify the snowflake.yml for setting the role and warehouse:

```console
      ...
      role: ACCOUNTADMIN
      warehouse: MY_NATIVE_WH 
      ....
```

Modify the makefile for setting the CLI connection 

```console
      ...
      snow_conn_name = COLLAPP
      snow_role= ACCOUNTADMIN
      ....
```
and run:


```console
make all
```

Once the app is installed, grant the tables and warehouse to the app (will improve this...):

```console
GRANT USAGE ON DATABASE IE to APPLICATION OEE_APP_INSTANCE;
GRANT USAGE ON SCHEMA IE.PUBLIC to APPLICATION OEE_APP_INSTANCE;
GRANT SELECT ON TABLE IE.PUBLIC.PRODUCTION_DATA to APPLICATION OEE_APP_INSTANCE;
GRANT USAGE ON WAREHOUSE OEE_NATIVE_WH to APPLICATION OEE_APP_INSTANCE;
GRANT DATABASE ROLE SNOWFLAKE.CORTEX_USER to APPLICATION OEE_APP_INSTANCE;
```

---


# Running local docker

If your Snowflake account is VPN protected, force the VPN DNS when running the container, example:

```console
docker run --dns 10.0.0.1 oee_frontbackend 
```

---