#define UNICODE
#define _UNICODE

#include <process.h>
#include <stdlib.h>
#include <wchar.h>
#include <windows.h>

int wmain(int argc, wchar_t **argv) {
  wchar_t executable_path[32768];
  DWORD length = GetModuleFileNameW(NULL, executable_path, 32768);
  if (length == 0 || length >= 32768) return 126;

  wchar_t *separator = wcsrchr(executable_path, L'\\');
  if (separator == NULL) return 126;
  separator[1] = L'\0';

  const wchar_t *script_name = L"verify-native-target.mjs";
  if (wcslen(executable_path) + wcslen(script_name) + 1 >= 32768) return 126;
  wcscat(executable_path, script_name);

  wchar_t **child_argv = (wchar_t **)calloc((size_t)argc + 2, sizeof(wchar_t *));
  if (child_argv == NULL) return 126;
  child_argv[0] = L"node";
  child_argv[1] = executable_path;
  for (int index = 1; index < argc; index += 1) child_argv[index + 1] = argv[index];
  child_argv[argc + 1] = NULL;

  intptr_t result = _wspawnvp(_P_WAIT, L"node", (const wchar_t * const *)child_argv);
  free(child_argv);
  if (result == -1) return 127;
  return (int)result;
}
