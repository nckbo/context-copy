import ast
import importlib.util
import json
import os
import sys


def extract_imports(code):
    tree = ast.parse(code)
    imports = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                # Handle relative imports by counting the dots
                module = '.' * node.level + node.module
            else:
                module = '.' * node.level
            imports.append(module)

    return imports


def resolve_module_path(module_name):
    """Resolve the absolute file path of a given Python module name."""
    try:
        spec = importlib.util.find_spec(module_name)
        if spec and spec.origin:
            return spec.origin  # Return absolute path
        else:
            return f"Module '{module_name}' could not be resolved"
    except ModuleNotFoundError:
        return f"Module '{module_name}' not found"


if __name__ == "__main__":
    code = sys.stdin.read()
    imports = extract_imports(code)

    resolved_paths = {}
    for module in imports:
        resolved_paths[module] = resolve_module_path(module)

    print(json.dumps(resolved_paths, indent=4))
