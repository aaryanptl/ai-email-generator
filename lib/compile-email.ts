import * as ReactEmailComponents from "@react-email/components";
import { render } from "@react-email/render";
import React from "react";
import { transform } from "sucrase";

const stripCodeFence = (source: string) => {
	const trimmed = source.trim();
	const fencedMatch = trimmed.match(/^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n```$/);
	return fencedMatch ? fencedMatch[1].trim() : trimmed;
};

const inferComponentName = (source: string) => {
	const patterns = [
		/\bfunction\s+([A-Z][A-Za-z0-9_]*)\s*\(/g,
		/\bconst\s+([A-Z][A-Za-z0-9_]*)\s*=/g,
		/\blet\s+([A-Z][A-Za-z0-9_]*)\s*=/g,
		/\bvar\s+([A-Z][A-Za-z0-9_]*)\s*=/g,
		/\bclass\s+([A-Z][A-Za-z0-9_]*)\b/g,
	];

	for (const pattern of patterns) {
		const matches = [...source.matchAll(pattern)];
		const candidate = matches.at(-1)?.[1];
		if (candidate) {
			return candidate;
		}
	}

	return null;
};

export const normalizeEmailSource = (source: string) => {
	let normalized = stripCodeFence(source).replace(/\r\n/g, "\n").trim();

	if (!normalized) {
		return "";
	}

	const hasReactImport =
		/require\(\s*["']react["']\s*\)/.test(normalized) ||
		/from\s+["']react["']/.test(normalized) ||
		/import\s+\*\s+as\s+React\b/.test(normalized);
	const needsReactImport =
		/<[A-Za-z]/.test(normalized) || normalized.includes("React.createElement");

	if (!hasReactImport && needsReactImport) {
		normalized = `import React from "react";\n${normalized}`;
	}

	const hasSupportedExport =
		/\bmodule\.exports\.default\b/.test(normalized) ||
		/\bexports\.default\b/.test(normalized) ||
		/\bmodule\.exports\s*=/.test(normalized) ||
		/\bexport\s+default\b/.test(normalized);

	if (!hasSupportedExport) {
		const componentName = inferComponentName(normalized);
		if (componentName) {
			normalized = `${normalized}\n\nmodule.exports.default = ${componentName};`;
		}
	}

	return normalized;
};

export async function compileEmail(tsxCode: string): Promise<string> {
	const normalizedTsxCode = normalizeEmailSource(tsxCode);

	if (!normalizedTsxCode) {
		throw new Error("Email template source is empty.");
	}

	// Transform TSX to JavaScript using Sucrase
	const { code: jsCode } = transform(normalizedTsxCode, {
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
		throw new Error(
			`Module not found: ${name}. Only "@react-email/components" and "react" are available.`,
		);
	};

	// Execute the compiled code in a function scope
	// Note: React is intentionally NOT passed as a separate parameter here.
	// The AI-generated code may include "import React from 'react'" which Sucrase
	// transforms into var React = require("react"). Passing React as a parameter too
	// would cause "Identifier 'React' has already been declared". React is available
	// via customRequire("react") which handles the transformed import automatically.
	const fn = new Function("require", "module", "exports", jsCode);
	fn(customRequire, moduleObj, moduleExports);

	// Get the default export. Prefer a component function, but tolerate a
	// pre-constructed React element because model output is sometimes shaped that way.
	const exports = moduleObj.exports as Record<string, unknown>;
	const emailExport = exports.default || exports;

	if (!emailExport) {
		throw new Error(
			"Email template must export a React component or include a recognizable top-level component.",
		);
	}

	const element =
		typeof emailExport === "function"
			? React.createElement(emailExport as React.ComponentType, {})
			: React.isValidElement(emailExport)
				? emailExport
				: null;

	if (!element) {
		throw new Error(
			"Email template must export a default React component function or a valid React element.",
		);
	}

	const html = await render(element);

	return html;
}
