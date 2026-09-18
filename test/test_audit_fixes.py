import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:4000"

FABRICATION_MARKERS = [
    "yatradham",
    "kumbh mela",
    "kumbh",
    "nashik",
    "trimbakeshwar",
    "dharamshala",
    "shahi snan",
    "maharashtra tourism",
    "tripadvisor.in",
    "makemytrip.com",
    "goibibo.com",
    "holidify.com"
]

def make_request(path, data=None, method="POST"):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except:
            return e.code, {}
    except Exception as e:
        return 500, {"error": str(e)}

def scan_for_markers(obj, markers):
    text = json.dumps(obj).lower()
    found = []
    for m in markers:
        if m.lower() in text:
            found.append(m)
    return found

def run_tests():
    print("=" * 70)
    print("OMNISEO-OS INDEPENDENT AUDIT VERIFICATION SUITE")
    print("=" * 70)
    passed = 0
    total = 0

    # TEST 1: Schema Validation & No 500 Crashes on /api/plan & /api/execute
    print("\n[TEST 1] Schema Validation on /api/plan and /api/execute...")
    total += 1
    s_plan_empty, r_plan_empty = make_request("/api/plan", {})
    s_exec_empty, r_exec_empty = make_request("/api/execute", {})
    if s_plan_empty == 400 and s_exec_empty == 400:
        print("  PASS: Malformed/Empty bodies correctly return 400 Bad Request")
        passed += 1
    else:
        print(f"  FAIL: Expected 400, got /api/plan={s_plan_empty}, /api/execute={s_exec_empty}")

    # TEST 2: /api/execute with { url, agents } payload (auditor pattern)
    print("\n[TEST 2] /api/execute with { url, agents } payload without query...")
    total += 1
    s_exec, r_exec = make_request("/api/execute", {
        "url": "https://example.com",
        "agents": ["agent_technical_crawler", "agent_psi_cwv", "agent_serp_keyword", "agent_backlink", "agent_geo_aeo"]
    })
    if s_exec == 200 and r_exec.get("success"):
        print("  PASS: /api/execute handled { url, agents } gracefully without error")
        passed += 1
    else:
        print(f"  FAIL: /api/execute failed with status {s_exec}: {r_exec}")

    # TEST 3: Zero Fabrication Markers for example.com
    print("\n[TEST 3] Testing for Pilgrimage Fabrication Markers on example.com...")
    total += 1
    markers_found = scan_for_markers(r_exec, FABRICATION_MARKERS)
    if not markers_found:
        print("  PASS: Zero pilgrimage fabrication markers found in example.com audit!")
        passed += 1
    else:
        print(f"  FAIL: Found fabrication markers in example.com result: {markers_found}")

    # TEST 4: Mathematical Integrity in GSC Simulation
    print("\n[TEST 4] GSC Simulation Mathematical Integrity...")
    total += 1
    s_gsc, r_gsc = make_request("/api/gsc", {"url": "https://example.com"})
    if s_gsc == 200:
        ctr_str = r_gsc.get("metrics", {}).get("avgCTR", "0%")
        ctr_val = float(ctr_str.replace("%", ""))
        clicks = r_gsc.get("metrics", {}).get("totalClicksRaw", 0)
        impr = r_gsc.get("metrics", {}).get("totalImpressionsRaw", 0)
        print(f"  GSC Metrics: Clicks={clicks}, Impressions={impr}, CTR={ctr_str}")
        if 0.0 <= ctr_val <= 100.0 and clicks <= impr:
            print("  PASS: CTR is mathematically sound (<= 100% and clicks <= impressions)")
            passed += 1
        else:
            print(f"  FAIL: Mathematical anomaly: CTR={ctr_val}%, clicks={clicks}, impr={impr}")
    else:
        print(f"  FAIL: GSC request returned status {s_gsc}")

    # TEST 5: Domain Classification & Realistic Backlinks for Mega Domain
    print("\n[TEST 5] Domain Classification & Backlinks (wikipedia.org)...")
    total += 1
    s_wiki_bl, r_wiki_bl = make_request("/api/backlinks", {"domain": "wikipedia.org"})
    if s_wiki_bl == 200:
        da = r_wiki_bl.get("domainAuthority", 0)
        ref_domains = r_wiki_bl.get("referringDomainsCount", 0)
        markers = scan_for_markers(r_wiki_bl, FABRICATION_MARKERS)
        print(f"  Wikipedia Authority: DA={da}, Referring Domains={ref_domains}")
        if da >= 90 and ref_domains > 100000 and not markers:
            print("  PASS: Wikipedia classified as Mega tier with realistic DA and zero fabrication markers")
            passed += 1
        else:
            print(f"  FAIL: Expected DA>=90, got DA={da}, refDomains={ref_domains}, markers={markers}")
    else:
        print(f"  FAIL: /api/backlinks returned status {s_wiki_bl}")

    # TEST 6: Competitor Gap Analysis on github.com
    print("\n[TEST 6] Competitor Gap Analysis on github.com...")
    total += 1
    s_gap, r_gap = make_request("/api/competitor-gap", {"targetUrl": "https://github.com"})
    if s_gap == 200:
        gap_data = r_gap.get("gapData", {})
        comp_host = gap_data.get("compHost", "")
        markers = scan_for_markers(gap_data, FABRICATION_MARKERS)
        print(f"  Target: github.com, Auto-Selected Competitor: {comp_host}")
        if comp_host in ["gitlab.com", "wikipedia.org"] and not markers:
            print(f"  PASS: Realistic sector competitor '{comp_host}' with zero fabrication markers")
            passed += 1
        else:
            print(f"  FAIL: Unexpected competitor '{comp_host}' or markers found: {markers}")
    else:
        print(f"  FAIL: /api/competitor-gap returned status {s_gap}")

    # TEST 7: AI Copilot Prompt for Technology Page
    print("\n[TEST 7] AI Strategy Copilot on Tech Page...")
    total += 1
    s_ai, r_ai = make_request("/api/ai-prompt", {
        "prompt": "Give me keyword content cluster recommendations",
        "url": "https://github.com"
    })
    if s_ai == 200:
        ai_resp = r_ai.get("response", "")
        markers = scan_for_markers(ai_resp, FABRICATION_MARKERS)
        if not markers:
            print("  PASS: AI Copilot returned domain-aware response without pilgrimage markers")
            passed += 1
        else:
            print(f"  FAIL: Pilgrimage markers leaked into AI response: {markers}")
    else:
        print(f"  FAIL: /api/ai-prompt returned status {s_ai}")

    # TEST 8: SSRF Protections
    print("\n[TEST 8] SSRF Protection on Sensitive/Internal IPs...")
    total += 1
    ssrf_targets = [
        "http://169.254.169.254/latest/meta-data/",
        "http://localhost:8080/admin",
        "http://127.0.0.1:4000/internal",
        "http://10.0.0.1/status",
        "http://192.168.1.1/router"
    ]
    all_blocked = True
    for target in ssrf_targets:
        st, _ = make_request("/api/audit", {"url": target})
        if st != 400:
            print(f"  FAIL: SSRF target {target} was NOT blocked (status={st})")
            all_blocked = False
            break
        st_dom, _ = make_request("/api/domain", {"url": target})
        if st_dom != 400:
            print(f"  FAIL: SSRF target {target} was NOT blocked on /api/domain (status={st_dom})")
            all_blocked = False
            break
    if all_blocked:
        print("  PASS: All SSRF attack targets successfully rejected with 400 Bad Request")
        passed += 1

    # TEST 9: Provenance Badges
    print("\n[TEST 9] Provenance Transparency Badges...")
    total += 1
    s_dom, r_dom = make_request("/api/domain", {"url": "https://example.com"})
    prov = r_dom.get("provenance", "")
    print(f"  Domain Provenance Badge: '{prov}'")
    if prov:
        print("  PASS: Provenance badge clearly declared")
        passed += 1
    else:
        print("  FAIL: Missing provenance badge in domain overview")

    print("\n" + "=" * 70)
    print(f"RESULTS: {passed}/{total} Tests Passed ({passed*100//total}%)")
    print("=" * 70)
    if passed == total:
        print("ALL AUDIT VERIFICATIONS PASSED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("SOME TESTS FAILED.")
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
