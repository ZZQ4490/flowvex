use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use tera::{Context, Tera};

/// Prompt template using Tera (similar to Jinja2)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptTemplate {
    pub template: String,
    pub variables: HashMap<String, JsonValue>,
}

impl PromptTemplate {
    pub fn new(template: String) -> Self {
        Self {
            template,
            variables: HashMap::new(),
        }
    }

    pub fn with_variables(template: String, variables: HashMap<String, JsonValue>) -> Self {
        Self {
            template,
            variables,
        }
    }

    pub fn set_variable(&mut self, key: String, value: JsonValue) {
        self.variables.insert(key, value);
    }

    pub fn render(&self) -> Result<String, TemplateError> {
        let engine = TemplateEngine::new();
        engine.render(&self.template, &self.variables)
    }
}

/// Template engine for rendering prompts
pub struct TemplateEngine {
    #[allow(dead_code)]
    tera: Tera,
}

impl TemplateEngine {
    pub fn new() -> Self {
        Self {
            tera: Tera::default(),
        }
    }

    /// Render a template with variables
    pub fn render(
        &self,
        template: &str,
        variables: &HashMap<String, JsonValue>,
    ) -> Result<String, TemplateError> {
        let mut context = Context::new();

        // Convert JsonValue to tera values
        for (key, value) in variables {
            match value {
                JsonValue::String(s) => context.insert(key, s),
                JsonValue::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        context.insert(key, &i);
                    } else if let Some(f) = n.as_f64() {
                        context.insert(key, &f);
                    }
                }
                JsonValue::Bool(b) => context.insert(key, b),
                JsonValue::Array(arr) => context.insert(key, arr),
                JsonValue::Object(obj) => context.insert(key, obj),
                JsonValue::Null => context.insert(key, &Option::<String>::None),
            }
        }

        Tera::one_off(template, &context, false)
            .map_err(|e| TemplateError::RenderError(e.to_string()))
    }

    /// Validate template syntax
    pub fn validate(&self, template: &str) -> Result<(), TemplateError> {
        // Try to parse the template - Tera::render_str doesn't need mut
        Tera::one_off(template, &Context::new(), false)
            .map(|_| ())
            .map_err(|e| TemplateError::SyntaxError(e.to_string()))
    }

    /// Extract variable names from template
    pub fn extract_variables(&self, template: &str) -> Vec<String> {
        let mut variables = Vec::new();
        let re = regex::Regex::new(r"\{\{\s*(\w+)\s*\}\}").unwrap();

        for cap in re.captures_iter(template) {
            if let Some(var) = cap.get(1) {
                let var_name = var.as_str().to_string();
                if !variables.contains(&var_name) {
                    variables.push(var_name);
                }
            }
        }

        variables
    }
}

impl Default for TemplateEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum TemplateError {
    #[error("Template render error: {0}")]
    RenderError(String),

    #[error("Template syntax error: {0}")]
    SyntaxError(String),

    #[error("Missing variable: {0}")]
    MissingVariable(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_template_render() {
        let mut template = PromptTemplate::new("Hello {{ name }}!".to_string());
        template.set_variable("name".to_string(), JsonValue::String("World".to_string()));

        let result = template.render().unwrap();
        assert_eq!(result, "Hello World!");
    }

    #[test]
    fn test_extract_variables() {
        let engine = TemplateEngine::new();
        let template = "Hello {{ name }}, you are {{ age }} years old.";
        let vars = engine.extract_variables(template);

        assert_eq!(vars.len(), 2);
        assert!(vars.contains(&"name".to_string()));
        assert!(vars.contains(&"age".to_string()));
    }

    #[test]
    fn test_template_with_loop() {
        let engine = TemplateEngine::new();
        let template = "{% for item in items %}{{ item }}{% endfor %}";
        let mut vars = HashMap::new();
        vars.insert(
            "items".to_string(),
            JsonValue::Array(vec![
                JsonValue::String("a".to_string()),
                JsonValue::String("b".to_string()),
            ]),
        );

        let result = engine.render(template, &vars).unwrap();
        assert_eq!(result, "ab");
    }
}
