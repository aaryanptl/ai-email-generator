import { transform } from "sucrase";
import React from "react";
import * as ReactEmailComponents from "@react-email/components";
import { render } from "@react-email/render";

export async function compileEmail(tsxCode: string): Promise<string> {
  // Transform TSX to JavaScript using Sucrase
  const { code: jsCode } = transform(tsxCode, {
    transforms: ["typescript", "jsx", "imports"],
    jsxRuntime: "classic",
    jsxPragma: "React.createElement",
    jsxFragmentPragma: "React.Fragment",
  });

  // Create a sandboxed module environment
  const moduleExports: Record<string, unknown> = {};
  const moduleObj = { exports: moduleExports };

  const customRequire = (name: string) => {
    if (name === "@react-email/components") return ReactEmailComponents;
    if (name === "react") return React;
    throw new Error(`Module not found: ${name}. Only "@react-email/components" and "react" are available.`);
  };

  // Execute the compiled code in a function scope
  // Note: React is intentionally NOT passed as a separate parameter here.
  // The AI-generated code may include "import React from 'react'" which Sucrase
  // transforms into var React = require("react"). Passing React as a parameter too
  // would cause "Identifier 'React' has already been declared". React is available
  // via customRequire("react") which handles the transformed import automatically.
  const fn = new Function("require", "module", "exports", jsCode);
  fn(customRequire, moduleObj, moduleExports);

  // Get the default export (the email component)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exports = moduleObj.exports as any;
  const EmailComponent: React.ComponentType = exports.default || exports;

  if (!EmailComponent || typeof EmailComponent !== "function") {
    throw new Error(
      "Email template must export a default React component via module.exports.default"
    );
  }

  // Render the component to HTML
  const element = React.createElement(EmailComponent, {});
  const html = await render(element);

  return html;
}
