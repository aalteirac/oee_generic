
import { keymap } from "@codemirror/view";
import { acceptCompletion } from "@codemirror/autocomplete";
import { indentMore } from "@codemirror/commands";
import { EditorView } from "@codemirror/view";

export const lightAutocompleteTheme = EditorView.theme({
    ".cm-tooltip-autocomplete": {
      backgroundColor: "#ffffff",
      color: "#1a1a1a",
      border: "1px solid #ddd",
      fontFamily: "monospace",
      fontSize: "13px",
    },
    ".cm-tooltip-autocomplete li": {
      padding: "4px 8px",
    },
    ".cm-tooltip-autocomplete li[aria-selected]": {
      backgroundColor: "#e0e0e0",
      color: "#000000",
    }
  }, { dark: false });
  
export const customAutocompleteTheme = EditorView.theme({
    ".cm-tooltip-autocomplete": {
      backgroundColor: "#1e1e2f",
      color: "#f8f8f2",
      border: "1px solid #444",
      fontFamily: "monospace",
      fontSize: "13px",
    },
    ".cm-tooltip-autocomplete > ul": {
      maxHeight: "200px",
      overflowY: "auto",
    },
    ".cm-tooltip-autocomplete li": {
      padding: "4px 8px",
    },
    ".cm-tooltip-autocomplete li[aria-selected]": {
      backgroundColor: "#44475a",
      color: "#ffffff",
    }
  }, { dark: true });

export const customTabBehavior = keymap.of([
    {
      key: "Tab",
      run: (view) => {
        // First, try accepting completion if it’s active
        const completionAccepted = acceptCompletion(view);
        if (completionAccepted) return true;
  
        // Otherwise, indent the current line
        return indentMore(view);
      },
      preventDefault: true,
    }
]);

export const customCompletions = (context) => {
  const word = context.matchBefore(/\w*/);
  if (word.from == word.to && !context.explicit) return null;

  return {
    from: word.from,
    options: [
        // Semantic Model Root
        { label: "name: ", type: "property", info: "Unique name for the semantic model" },
        { label: "description: ", type: "property", info: "Description of the semantic model" },
        { label: "tables: ", type: "property", info: "List of logical tables" },
        { label: "relationships: ", type: "property", info: "Table join relationships" },
        { label: "verified_queries: ", type: "property", info: "Verified SQL questions and answers" },
  
        // Logical Table Level
        { label: "base_table: ", type: "property", info: "Underlying Snowflake table mapping" },
        { label: "synonyms: ", type: "property", info: "Alternate names for the table or field" },
        { label: "primary_key: ", type: "property", info: "Primary key columns for relationships" },
        { label: "dimensions: ", type: "property", info: "Categorical attributes" },
        { label: "time_dimensions: ", type: "property", info: "Time-based attributes" },
        { label: "facts: ", type: "property", info: "Raw numeric columns (also known as measures)" },
        { label: "metrics: ", type: "property", info: "Derived performance indicators" },
        { label: "filters: ", type: "property", info: "Reusable filter expressions" },
  
        // Field-Level Properties (Dimension, Time Dimension, Fact, Metric)
        { label: "expr: ", type: "property", info: "SQL expression for the field" },
        { label: "data_type: ", type: "property", info: "Data type, e.g., STRING, NUMBER, TIMESTAMP" },
        { label: "unique: ", type: "property", info: "Indicates if field values are unique" },
        { label: "sample_values: ", type: "property", info: "Examples of field values" },
        { label: "is_enum: ", type: "property", info: "Marks sample_values as exhaustive list" },
  
        // Cortex Search Service
        { label: "cortex_search_service: ", type: "property", info: "Custom search service integration" },
        { label: "service: ", type: "property", info: "Cortex service name" },
        { label: "literal_column: ", type: "property", info: "Column containing search literals" },
        { label: "database: ", type: "property", info: "Name of the Snowflake database" },
        { label: "schema: ", type: "property", info: "Schema in the Snowflake database" },
        { label: "table: ", type: "property", info: "Table name in the schema" },
  
        // Relationships
        { label: "left_table: ", type: "property", info: "The 'many' side of the join" },
        { label: "right_table: ", type: "property", info: "The 'one' side of the join" },
        { label: "relationship_columns: ", type: "property", info: "Column mapping for joins" },
        { label: "join_type: ", type: "enum", info: "left_outer | inner" },
        { label: "relationship_type: ", type: "enum", info: "many_to_one | one_to_one" }
      ]
  };
};
