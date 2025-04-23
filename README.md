This repo demonstrate an app that can be deployed either as
- Snowflake Native App (with Containers)
- Managed App hosted on prem or cloud managed containers
- Connected App, app owned by the provider, plug on customer Snowflake account

The code base is the same for the 3 options.
Logic detect if running inside or outside Snowflake and adjust the authentication accordingly.

The app demonstrate a basic old school dashboard and the next geenration to interact with Data, Cortex Analyst

Cortex Analyst is a fully-managed, LLM-powered Snowflake Cortex feature that helps you create applications capable of reliably answering business questions based on your structured data in Snowflake. 
With Cortex Analyst, business users can ask questions in natural language and receive direct answers without writing SQL. 

Available as a convenient REST API, Cortex Analyst is seamlessly integrated into this application

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