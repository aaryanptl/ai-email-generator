import { transform } from "sucrase";
import React from "react";
import * as ReactEmailComponents from "@react-email/components";
import { render } from "@react-email/render";

export async function compileEmail(tsxCode: string): Promise<string> {
  // Transform TSX to JavaScript using Sucrase
  const { code: jsCode } = transform(tsxCode, {
    transforms: ["typescript", "jsx"],
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
  const fn = new Function("require", "module", "exports", "React", jsCode);
  fn(customRequire, moduleObj, moduleExports, React);

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
