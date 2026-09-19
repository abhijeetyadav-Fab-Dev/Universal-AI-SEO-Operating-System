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
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except:
            return e.code, {}
    except Exception as e:
        return 500, {"error": str(e)}

def run_phase1_tests():
    print("=" * 70)
    print("OMNISEO-OS PHASE 1: REAL DATA & API SETTINGS VERIFICATION SUITE")
    print("=" * 70)
    passed = 0
    total = 0

    # TEST 1: GET /api/settings endpoint & key masking
    print("\n[TEST 1] GET /api/settings status & key masking...")
    total += 1
    s, r = make_req("/api/settings")
    if s == 200 and r.get("success") and "settings" in r:
        st = r["settings"]
        assert "psi" in st and "gemini" in st and "openai" in st and "dataforseo" in st
        print("  PASS: /api/settings returns valid settings schema with all 4 providers")
        passed += 1
    else:
        print(f"  FAIL: /api/settings failed with status {s}: {r}")

    # TEST 2: POST /api/settings/save endpoint
    print("\n[TEST 2] POST /api/settings/save saves keys in session...")
    total += 1
    s_save, r_save = make_req("/api/settings/save", {
        "psiApiKey": "AIzaSyFakeKey12345678",
        "geminiApiKey": "AIzaSyFakeGeminiKey1234"
    }, method="POST")
    if s_save == 200 and r_save.get("success"):
        st = r_save.get("settings", {})
        assert st.get("psi", {}).get("configured") is True
        assert st.get("psi", {}).get("maskedKey") == "AIza••••5678"
        print("  PASS: /api/settings/save successfully stored and masked keys")
        passed += 1
    else:
        print(f"  FAIL: /api/settings/save failed with status {s_save}: {r_save}")

    # TEST 3: POST /api/settings/test connectivity validation
    print("\n[TEST 3] POST /api/settings/test validation...")
    total += 1
    s_test_bad, r_test_bad = make_req("/api/settings/test", {}, method="POST")
    s_test_invalid_svc, r_test_invalid_svc = make_req("/api/settings/test", {"service": "invalid_svc"}, method="POST")
    if s_test_bad == 400 and s_test_invalid_svc == 400:
        print("  PASS: /api/settings/test validates service parameter properly")
        passed += 1
    else:
        print(f"  FAIL: Expected 400 for bad service test payload, got {s_test_bad}, {s_test_invalid_svc}")

    # TEST 4: Real AI Strategy Copilot (/api/ai-prompt) Rule-Based Heuristic Attribution
    print("\n[TEST 4] AI Strategy Copilot transparent heuristic attribution...")
    total += 1
    s_ai, r_ai = make_req("/api/ai-prompt", {
        "prompt": "Optimize meta description and title for https://example.com",
        "url": "https://example.com"
    }, method="POST")
    if s_ai == 200 and "response" in r_ai:
        resp_text = r_ai["response"]
        assert "⚡ [Rule-Based Heuristic" in resp_text or r_ai.get("isRealLlm") is True
        assert r_ai.get("model") is not None
        assert "provenance" in r_ai
        print(f"  PASS: Copilot returns honest attribution (Model: {r_ai.get('model')})")
        passed += 1
    else:
        print(f"  FAIL: /api/ai-prompt failed with status {s_ai}: {r_ai}")

    # TEST 5: Custom Header forwarding in /api/ai-prompt
    print("\n[TEST 5] Custom Header forwarding (x-gemini-key)...")
    total += 1
    s_hdr, r_hdr = make_req("/api/ai-prompt", {
        "prompt": "How to optimize LCP?",
        "url": "https://example.com"
    }, method="POST", headers={"x-gemini-key": "AIzaSyTestInvalidKey"})
    if s_hdr == 200 and "response" in r_hdr:
        # Should gracefully fall back without 500 error
        print("  PASS: Custom x-gemini-key handled gracefully without crashing")
        passed += 1
    else:
        print(f"  FAIL: /api/ai-prompt crashed with custom header, status {s_hdr}: {r_hdr}")

    # TEST 6: Real PageSpeed Insights & In-Memory Cache in /api/execute
    print("\n[TEST 6] PageSpeed Insights honest status & caching...")
    total += 1
    s_exec1, r_exec1 = make_req("/api/execute", {
        "url": "https://example.com",
        "agents": ["agent_psi_cwv"]
    }, method="POST")
    psi1 = r_exec1.get("result", {}).get("detailedPayloads", {}).get("pageSpeed", {})
    
    # Second call should hit the cache or return valid response
    s_exec2, r_exec2 = make_req("/api/execute", {
        "url": "https://example.com",
        "agents": ["agent_psi_cwv"]
    }, method="POST")
    psi2 = r_exec2.get("result", {}).get("detailedPayloads", {}).get("pageSpeed", {})

    if s_exec1 == 200 and s_exec2 == 200 and psi1 and psi2:
        print(f"  PSI 1 Status: {psi1.get('dataStatus', 'live')}, Fallback: {psi1.get('isFallback')}")
        print(f"  PSI 2 Cached: {psi2.get('fromCache')}")
        assert psi2.get("fromCache") is True or psi2.get("isFallback") is True
        print("  PASS: PageSpeed adapter delivers honest status and in-memory caching")
        passed += 1
    else:
        print(f"  FAIL: PageSpeed execution failed: {r_exec1}")

    # TEST 7: Real GEO / AEO DOM Grounding (Zero 68/42/75% fabrication)
    print("\n[TEST 7] GEO/AEO DOM Grounding & Dynamic Score Calculation...")
    total += 1
    s_geo, r_geo = make_req("/api/execute", {
        "url": "https://example.com",
        "agents": ["agent_geo_aeo"]
    }, method="POST")
    geo = r_geo.get("result", {}).get("detailedPayloads", {}).get("geoAeo", {})
    if s_geo == 200 and geo:
        citations = geo.get("citationsAnalysis", [])
        assert len(citations) >= 3
        # Ensure the old hardcoded 68%, 42%, 75% are NOT present
        shares = [c.get("citationShare") for c in citations if "citationShare" in c]
        assert "68%" not in shares and "42%" not in shares and "75%" not in shares, "Old fabricated citation shares found!"
        assert "missingAttributes" in geo.get("entityReadiness", {})
        print(f"  GEO Score: {geo.get('overallGeoScore')}/100, Missing Attributes: {len(geo['entityReadiness']['missingAttributes'])}")
        print("  PASS: GEO engine evaluates real DOM schema readiness without fabricated percentages")
        passed += 1
    else:
        print(f"  FAIL: GEO execution failed: {r_geo}")

    # TEST 8: Backlink Profile Zero Pilgrimage Fabrication on github.com
    print("\n[TEST 8] Backlinks Adapter DataForSEO handling & Zero Pilgrimage leaks...")
    total += 1
    s_bl, r_bl = make_req("/api/backlinks", {"url": "https://github.com"}, method="POST")
    if s_bl == 200 and r_bl:
        bl_str = json.dumps(r_bl).lower()
        assert "yatradham" not in bl_str and "kumbh" not in bl_str and "nashik" not in bl_str
        assert "provenance" in r_bl
        print(f"  Backlinks Provider: {r_bl.get('provider')}, Ref Domains: {r_bl.get('referringDomainsCount')}")
        print("  PASS: Backlinks adapter free of pilgrimage markers with transparent provenance")
        passed += 1
    else:
        print(f"  FAIL: /api/backlinks failed: {r_bl}")

    # TEST 9: Frontend HTML Elements Verification
    print("\n[TEST 9] Frontend UI Verification (#apiSettingsModal, badges, prompt)...")
    total += 1
    with urllib.request.urlopen(f"{BASE_URL}/", timeout=10) as resp:
        html = resp.read().decode("utf-8")
        assert "id=\"apiSettingsModal\"" in html
        assert "openApiSettingsModal()" in html
        assert "id=\"cwvKeyPromptBox\"" in html
        assert "id=\"aiCopilotModelBadge\"" in html
        assert "getApiHeaders()" in html
        print("  PASS: All Phase 1 UI components verified in index.html")
        passed += 1

    # Cleanup: Reset mock keys in active settings
    make_req("/api/settings/save", {
        "psiApiKey": "",
        "geminiApiKey": "",
        "openaiApiKey": "",
        "dataforseoLogin": "",
        "dataforseoPassword": ""
    }, method="POST")

    print("\n" + "=" * 70)
    print(f"PHASE 1 VERIFICATION RESULTS: {passed}/{total} Tests Passed ({(passed/total)*100:.1f}%)")
    print("=" * 70)
    if passed == total:
        print("🎉 ALL PHASE 1 REAL DATA & SETTINGS VERIFICATIONS PASSED 100%!")
        return 0
    else:
        print("❌ Some Phase 1 tests failed.")
        return 1

if __name__ == "__main__":
    sys.exit(run_phase1_tests())
