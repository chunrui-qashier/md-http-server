/**
 * Expand environment variables in a string value.
 * Supports ${VAR_NAME} and ${VAR_NAME:-default} syntax.
 *
 * @param value - String that may contain env var references
 * @returns Object with expanded value and any warnings
 */
export const expandEnvVars = (value: string): { value: string; warnings: string[] } => {
  const warnings: string[] = [];
  const pattern = /\$\{([^}:]+)(?::-([^}]*))?\}/g;

  const expanded = value.replace(pattern, (match, varName, defaultValue) => {
    const envValue = process.env[varName];

    if (envValue !== undefined) {
      return envValue;
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    warnings.push(`Environment variable ${varName} is not defined`);
    return match; // Keep original if no default
  });

  return { value: expanded, warnings };
};

/**
 * Recursively expand environment variables in an object.
 */
export const expandEnvVarsInObject = (obj: Record<string, unknown>): {
  result: Record<string, unknown>;
  warnings: string[]
} => {
  const warnings: string[] = [];

  const processValue = (val: unknown): unknown => {
    if (typeof val === 'string') {
      const { value, warnings: w } = expandEnvVars(val);
      warnings.push(...w);
      return value;
    }
    if (Array.isArray(val)) {
      return val.map(processValue);
    }
    if (val !== null && typeof val === 'object') {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, processValue(v)])
      );
    }
    return val;
  };

  return {
    result: processValue(obj) as Record<string, unknown>,
    warnings,
  };
};
