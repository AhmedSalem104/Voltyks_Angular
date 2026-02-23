import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';

/**
 * Transforms API response keys from PascalCase to camelCase
 * This handles .NET backends that return PascalCase property names
 */
export const caseTransformInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map(event => {
      if (event instanceof HttpResponse && event.body) {
        // Skip transformation for Blob/ArrayBuffer responses (file downloads)
        if (event.body instanceof Blob || event.body instanceof ArrayBuffer) {
          return event;
        }
        const transformedBody = transformToCamelCase(event.body);
        return event.clone({ body: transformedBody });
      }
      return event;
    })
  );
};

/**
 * Recursively transforms object keys from PascalCase to camelCase
 */
function transformToCamelCase(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => transformToCamelCase(item));
  }

  if (typeof obj === 'object' && obj !== null) {
    const transformed: Record<string, unknown> = {};
    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = toCamelCase(key);
        transformed[camelKey] = transformToCamelCase((obj as Record<string, unknown>)[key]);
      }
    }
    return transformed;
  }

  return obj;
}

/**
 * Converts a string from PascalCase to camelCase
 */
function toCamelCase(str: string): string {
  if (!str) return str;

  // If already camelCase or all lowercase, return as is
  if (str[0] === str[0].toLowerCase()) {
    return str;
  }

  // Convert first character to lowercase
  return str.charAt(0).toLowerCase() + str.slice(1);
}
