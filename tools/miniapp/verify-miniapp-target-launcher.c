#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif

#include <windows.h>
#include <bcrypt.h>
#include <process.h>
#include <stdlib.h>
#include <string.h>
#include <wchar.h>

static const unsigned char expected_script_sha256[32] = {
    0xe7, 0x4f, 0x9a, 0x85, 0x9a, 0x0a, 0x30, 0x60,
    0x85, 0x11, 0x90, 0x08, 0xbb, 0x31, 0x67, 0xb1,
    0xfd, 0x3c, 0x14, 0x9a, 0xb1, 0xe7, 0x08, 0xa0,
    0x70, 0x60, 0xfd, 0x6e, 0x82, 0xe3, 0xf6, 0x25,
};

static int sha256_file(const wchar_t *path, unsigned char digest[32]) {
  BCRYPT_ALG_HANDLE algorithm = NULL;
  BCRYPT_HASH_HANDLE hash = NULL;
  HANDLE file = INVALID_HANDLE_VALUE;
  unsigned char *hash_object = NULL;
  DWORD object_length = 0;
  DWORD digest_length = 0;
  DWORD returned = 0;
  int result = 0;

  file = CreateFileW(path, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING,
                     FILE_ATTRIBUTE_NORMAL | FILE_FLAG_SEQUENTIAL_SCAN, NULL);
  if (file == INVALID_HANDLE_VALUE) goto cleanup;
  if (BCryptOpenAlgorithmProvider(&algorithm, BCRYPT_SHA256_ALGORITHM, NULL, 0) < 0)
    goto cleanup;
  if (BCryptGetProperty(algorithm, BCRYPT_OBJECT_LENGTH,
                        (PUCHAR)&object_length, sizeof(object_length),
                        &returned, 0) < 0)
    goto cleanup;
  if (BCryptGetProperty(algorithm, BCRYPT_HASH_LENGTH,
                        (PUCHAR)&digest_length, sizeof(digest_length),
                        &returned, 0) < 0 || digest_length != 32)
    goto cleanup;
  hash_object = (unsigned char *)calloc(object_length, 1);
  if (hash_object == NULL) goto cleanup;
  if (BCryptCreateHash(algorithm, &hash, hash_object, object_length,
                       NULL, 0, 0) < 0)
    goto cleanup;

  for (;;) {
    unsigned char buffer[64 * 1024];
    DWORD read_count = 0;
    if (!ReadFile(file, buffer, sizeof(buffer), &read_count, NULL)) goto cleanup;
    if (read_count == 0) break;
    if (BCryptHashData(hash, buffer, read_count, 0) < 0) goto cleanup;
  }
  if (BCryptFinishHash(hash, digest, 32, 0) < 0) goto cleanup;
  result = 1;

cleanup:
  if (hash != NULL) BCryptDestroyHash(hash);
  if (algorithm != NULL) BCryptCloseAlgorithmProvider(algorithm, 0);
  if (file != INVALID_HANDLE_VALUE) CloseHandle(file);
  free(hash_object);
  return result;
}

int wmain(int argc, wchar_t **argv) {
  wchar_t executable_path[32768];
  unsigned char actual_script_sha256[32];
  DWORD length = GetModuleFileNameW(NULL, executable_path, 32768);
  if (length == 0 || length >= 32768) return 126;

  wchar_t *separator = wcsrchr(executable_path, L'\\');
  if (separator == NULL) return 126;
  separator[1] = L'\0';

  const wchar_t *script_name = L"verify-miniapp-target.mjs";
  if (wcslen(executable_path) + wcslen(script_name) + 1 >= 32768) return 126;
  wcscat(executable_path, script_name);
  if (!sha256_file(executable_path, actual_script_sha256)) return 126;
  if (memcmp(actual_script_sha256, expected_script_sha256, 32) != 0) return 125;

  wchar_t **child_argv = (wchar_t **)calloc((size_t)argc + 2, sizeof(wchar_t *));
  if (child_argv == NULL) return 126;
  child_argv[0] = L"node";
  child_argv[1] = executable_path;
  for (int index = 1; index < argc; index += 1) child_argv[index + 1] = argv[index];
  child_argv[argc + 1] = NULL;

  intptr_t result = _wspawnvp(_P_WAIT, L"node", (const wchar_t *const *)child_argv);
  free(child_argv);
  if (result == -1) return 127;
  return (int)result;
}
