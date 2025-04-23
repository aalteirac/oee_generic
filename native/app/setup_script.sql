CREATE APPLICATION ROLE IF NOT EXISTS app_user;
CREATE APPLICATION ROLE IF NOT EXISTS app_admin;

CREATE SCHEMA IF NOT EXISTS core;
GRANT USAGE ON SCHEMA core TO APPLICATION ROLE app_user;

CREATE OR ALTER VERSIONED SCHEMA app_public;
GRANT USAGE ON SCHEMA app_public TO APPLICATION ROLE app_user;


CREATE OR REPLACE PROCEDURE core.register_single_callback(ref_name STRING, operation STRING, ref_or_alias STRING)
RETURNS STRING
LANGUAGE SQL
AS
$$
  BEGIN
    CASE (operation)
      WHEN 'ADD' THEN
        SELECT SYSTEM$SET_REFERENCE(:ref_name, :ref_or_alias);
       
      WHEN 'REMOVE' THEN
        SELECT SYSTEM$REMOVE_REFERENCE(:ref_name);
      WHEN 'CLEAR' THEN
        SELECT SYSTEM$REMOVE_REFERENCE(:ref_name);
    ELSE
      RETURN 'unknown operation: ' || operation;
    END CASE;
  END;
$$;

GRANT USAGE ON PROCEDURE core.register_single_callback(STRING, STRING, STRING) TO APPLICATION ROLE app_user;

CREATE OR REPLACE PROCEDURE core.get_configuration(ref_name STRING)
RETURNS STRING
LANGUAGE SQL
AS
$$
BEGIN
  CASE (UPPER(ref_name))
      WHEN 'GOOGLE_REF' THEN
          RETURN OBJECT_CONSTRUCT(
              'type', 'CONFIGURATION',
              'payload', OBJECT_CONSTRUCT(
                  'host_ports', ARRAY_CONSTRUCT('fonts.googleapis.com:443','fonts.gstatic.com:443','sfsenorthamerica-college_app_aalteirac.snowflakecomputing.com:443'),
                  'allowed_secrets', 'NONE')
          )::STRING;
      ELSE
          RETURN 'WRONG';
  END CASE;
END;
$$;

GRANT USAGE ON PROCEDURE core.get_configuration(STRING) TO APPLICATION ROLE app_user;
CREATE OR REPLACE PROCEDURE core.grant_callback(priv array)
RETURNS STRING
LANGUAGE SQL
AS
$$ 
   CALL app_public.start_app(); 
$$;

GRANT USAGE ON PROCEDURE core.grant_callback(array) to APPLICATION ROLE app_user;

CREATE OR REPLACE PROCEDURE app_public.start_app()
   RETURNS string
   LANGUAGE sql
   AS
$$
BEGIN
   LET pool_name := (SELECT CURRENT_DATABASE()) || '_compute_pool';

   CREATE COMPUTE POOL IF NOT EXISTS IDENTIFIER(:pool_name)
      MIN_NODES = 1
      MAX_NODES = 1
      INSTANCE_FAMILY = CPU_X64_XS
      AUTO_RESUME = true;

   CREATE SERVICE IF NOT EXISTS core.oee
      IN COMPUTE POOL identifier(:pool_name)
      EXTERNAL_ACCESS_INTEGRATIONS = (reference('GOOGLE_REF'))
      FROM spec='service/oee.yaml';

   GRANT SERVICE ROLE core.oee!ALL_ENDPOINTS_USAGE TO APPLICATION ROLE app_user;   

   RETURN 'Service successfully created';
END;
$$;

GRANT USAGE ON PROCEDURE app_public.start_app() TO APPLICATION ROLE app_user;

CREATE OR REPLACE PROCEDURE app_public.service_status()
RETURNS VARCHAR
LANGUAGE SQL
EXECUTE AS OWNER
AS $$
   DECLARE
         service_status VARCHAR;
   BEGIN
         CALL SYSTEM$GET_SERVICE_STATUS('core.oee') INTO :service_status;
         RETURN PARSE_JSON(:service_status)[0]['status']::VARCHAR;
   END;
$$;

GRANT USAGE ON PROCEDURE app_public.service_status() TO APPLICATION ROLE app_user;

CREATE OR REPLACE PROCEDURE app_public.showcontainers()
RETURNS TABLE()
LANGUAGE PYTHON
PACKAGES = ('snowflake-snowpark-python')
RUNTIME_VERSION = 3.9
HANDLER = 'main'
as
$$
def main(session):
    df= session.sql(f"""
    SHOW SERVICE CONTAINERS IN SERVICE core.oee
    """)
    return df
$$;

GRANT USAGE ON PROCEDURE app_public.showcontainers() TO APPLICATION ROLE app_user;

CREATE OR REPLACE PROCEDURE app_public.service_logs(container_name varchar)
RETURNS TABLE()
LANGUAGE PYTHON
PACKAGES = ('snowflake-snowpark-python')
RUNTIME_VERSION = 3.9
HANDLER = 'main'
as
$$
def main(session, container_name):
    return session.sql(f"""
    CALL SYSTEM$GET_SERVICE_LOGS('core.oee', 0, '{container_name}')
    """)
$$;
GRANT USAGE ON PROCEDURE app_public.service_logs(varchar) TO APPLICATION ROLE app_user;

CREATE OR REPLACE PROCEDURE app_public.getEndpoints()
RETURNS TABLE()
LANGUAGE PYTHON
PACKAGES = ('snowflake-snowpark-python')
RUNTIME_VERSION = 3.9
HANDLER = 'main'
as
$$
def main(session):
    return session.sql(f"""
    SHOW ENDPOINTS IN SERVICE core.oee
    """)
$$;

GRANT USAGE ON PROCEDURE app_public.getEndpoints() TO APPLICATION ROLE app_user;

CREATE OR REPLACE PROCEDURE app_public.getCortexHost()
RETURNS TABLE()
LANGUAGE PYTHON
PACKAGES = ('snowflake-snowpark-python')
RUNTIME_VERSION = 3.9
HANDLER = 'main'
as
$$
def main(session):
    return session.sql(f"""
    SHOW ENDPOINTS IN SERVICE core.oee
    """)
$$;

GRANT USAGE ON PROCEDURE app_public.getCortexHost() TO APPLICATION ROLE app_user;

CREATE OR REPLACE PROCEDURE app_public.version_init()
RETURNS STRING
LANGUAGE SQL
AS
$$
DECLARE
can_create_compute_pool BOOLEAN;
BEGIN

   SELECT SYSTEM$HOLD_PRIVILEGE_ON_ACCOUNT('CREATE COMPUTE POOL')
      INTO can_create_compute_pool;

   ALTER SERVICE IF EXISTS core.oee
      FROM spec='service/oee.yaml';
   IF (can_create_compute_pool) THEN
      SELECT SYSTEM$WAIT_FOR_SERVICES(120, 'core.oee');
   END IF;
   RETURN 'DONE';
END;
$$;