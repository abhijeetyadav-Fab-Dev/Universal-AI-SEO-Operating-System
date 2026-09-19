import json
import urllib.request
import urllib.error
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:4000"

def make_req(path, data=None, method="GET", headers=None):
    url = f"{BASE_URL}{path}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            content_type = resp.headers.get("Content-Type", "")
            raw = resp.read().decode("utf-8")
            if "application/json" in content_type:
                return resp.status, json.loads(raw), resp.headers
            return resp.status, raw, resp.headers
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8")), e.headers
        except:
            return e.code, {}, e.headers
    except Exception as e:
        return 500, {"error": str(e)}, {}

def run_phase2_tests():
    print("=" * 75)
    print("OMNISEO-OS PHASE 2: ENTERPRISE API (V1) & OPENAPI 3.0 VERIFICATION SUITE")
    print("=" * 75)
    passed = 0
    total = 0

    # TEST 1: OpenAPI 3.0 Spec JSON Endpoints
    print("\n[TEST 1] OpenAPI 3.0 Spec JSON (/api/openapi.json & /api/v1/openapi.json)...")
    total += 1
    s1, r1, h1 = make_req("/api/openapi.json")
    s2, r2, h2 = make_req("/api/v1/openapi.json")
    if s1 == 200 and s2 == 200 and isinstance(r1, dict) and r1.get("openapi", "").startswith("3.0"):
        assert "paths" in r1 and "components" in r1
        assert "/api/v1/execute" in r1["paths"]
        assert "/api/v1/plan" in r1["paths"]
        assert "/api/v1/settings" in r1["paths"]
        assert "securitySchemes" in r1["components"]
        print("  PASS: Both /api/openapi.json and /api/v1/openapi.json serve valid OpenAPI 3.0 spec")
        passed += 1
    else:
        print(f"  FAIL: OpenAPI endpoints failed (status {s1}, {s2})")

    # TEST 2: Interactive Swagger Documentation (/api/docs & /api/v1/docs)
    print("\n[TEST 2] Interactive Swagger UI (/api/docs & /api/v1/docs)...")
    total += 1
    s_doc1, r_doc1, h_doc1 = make_req("/api/docs")
    s_doc2, r_doc2, h_doc2 = make_req("/api/v1/docs")
    if s_doc1 == 200 and s_doc2 == 200 and "SwaggerUIBundle" in r_doc1 and "SwaggerUIBundle" in r_doc2:
        assert "/api/v1/openapi.json" in r_doc1
        print("  PASS: Both /api/docs and /api/v1/docs render interactive Swagger UI successfully")
        passed += 1
    else:
        print(f"  FAIL: Swagger UI endpoints failed (status {s_doc1}, {s_doc2})")

    # TEST 3: Versioned /api/v1/settings
    print("\n[TEST 3] Versioned /api/v1/settings GET & POST...")
    total += 1
    s_set, r_set, _ = make_req("/api/v1/settings")
    if s_set == 200 and r_set.get("success") and "settings" in r_set:
        print("  PASS: /api/v1/settings returns enterprise key configurations")
        passed += 1
    else:
        print(f"  FAIL: /api/v1/settings failed with status {s_set}: {r_set}")

    # TEST 4: Versioned /api/v1/plan
    print("\n[TEST 4] Versioned /api/v1/plan endpoint...")
    total += 1
    s_plan, r_plan, _ = make_req("/api/v1/plan", {"query": "Audit https://example.com and check Core Web Vitals"}, method="POST")
    if s_plan == 200 and r_plan.get("success") and "plan" in r_plan:
        agents = [a["id"] for a in r_plan["plan"]["executionPlan"]["agents"]]
        assert "agent_psi_cwv" in agents
        print(f"  PASS: /api/v1/plan synthesized plan with {len(agents)} autonomous agents")
        passed += 1
    else:
        print(f"  FAIL: /api/v1/plan failed with status {s_plan}: {r_plan}")

    # TEST 5: Versioned /api/v1/ai-prompt
    print("\n[TEST 5] Versioned /api/v1/ai-prompt endpoint...")
    total += 1
    s_ai, r_ai, _ = make_req("/api/v1/ai-prompt", {
        "prompt": "How to optimize LCP for https://example.com?",
        "url": "https://example.com"
    }, method="POST")
    if s_ai == 200 and "response" in r_ai and "model" in r_ai:
        print(f"  PASS: /api/v1/ai-prompt returned strategic copilot response (Model: {r_ai.get('model')})")
        passed += 1
    else:
        print(f"  FAIL: /api/v1/ai-prompt failed with status {s_ai}: {r_ai}")

    # TEST 6: Versioned /api/v1/domain, /api/v1/gsc, /api/v1/rank, /api/v1/brand
    print("\n[TEST 6] Versioned /api/v1/domain, /gsc, /rank, /brand endpoints...")
    total += 1
    s_dom, r_dom, _ = make_req("/api/v1/domain", {"url": "https://example.com"}, method="POST")
    s_gsc, r_gsc, _ = make_req("/api/v1/gsc", {"url": "https://example.com"}, method="POST")
    s_rnk, r_rnk, _ = make_req("/api/v1/rank", {"url": "https://example.com"}, method="POST")
    s_brn, r_brn, _ = make_req("/api/v1/brand", {"brand": "example"}, method="POST")

    if all(s == 200 for s in [s_dom, s_gsc, s_rnk, s_brn]):
        assert "authority" in r_dom and "competitors" in r_dom
        assert "clicks" in r_gsc and "queries" in r_gsc
        assert "keywords" in r_rnk and len(r_rnk["keywords"]) > 0
        assert "sentiment" in r_brn and "mentions" in r_brn
        print("  PASS: All 4 OpenSEO companion v1 endpoints respond with structured data")
        passed += 1
    else:
        print(f"  FAIL: One or more companion v1 endpoints failed ({s_dom}, {s_gsc}, {s_rnk}, {s_brn})")

    # TEST 7: Versioned /api/v1/robots-sitemap & /api/v1/saved-keywords
    print("\n[TEST 7] Versioned /api/v1/robots-sitemap & /api/v1/saved-keywords...")
    total += 1
    s_rs, r_rs, _ = make_req("/api/v1/robots-sitemap", {"url": "https://example.com"}, method="POST")
    s_sk, r_sk, _ = make_req("/api/v1/saved-keywords", {"url": "https://example.com"}, method="POST")
    if s_rs == 200 and s_sk == 200:
        assert "robots" in r_rs and "sitemap" in r_rs
        assert "keywords" in r_sk
        print("  PASS: /api/v1/robots-sitemap and /api/v1/saved-keywords verified")
        passed += 1
    else:
        print(f"  FAIL: Failed status: {s_rs}, {s_sk}")

    # TEST 8: Zero-Regret Security Baseline on API v1
    print("\n[TEST 8] Security Header Audit (HSTS, CSP, no X-XSS-Protection)...")
    total += 1
    _, _, sec_headers = make_req("/api/v1/settings")
    assert "X-XSS-Protection" not in sec_headers, "Deprecated X-XSS-Protection header must not be set"
    assert "Strict-Transport-Security" in sec_headers
    assert "Content-Security-Policy" in sec_headers
    assert "cdn.jsdelivr.net" in sec_headers["Content-Security-Policy"]
    assert sec_headers.get("X-Content-Type-Options") == "nosniff"
    print("  PASS: Enterprise security headers verified across v1 API")
    passed += 1

    print("\n" + "=" * 75)
    print(f"PHASE 2 VERIFICATION RESULTS: {passed}/{total} Tests Passed ({(passed/total)*100:.1f}%)")
    print("=" * 75)
    if passed == total:
        print("🎉 ALL PHASE 2 ENTERPRISE API (V1) TESTS PASSED 100%!")
        return 0
    else:
        print("❌ Some Phase 2 tests failed.")
        return 1

if __name__ == "__main__":
    sys.exit(run_phase2_tests())
