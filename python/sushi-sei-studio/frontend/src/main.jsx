import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronRight, Clock, Leaf, MapPin, Menu as MenuIcon, Minus, Phone, Plus, Search, ShoppingBag, X } from "lucide-react";
import catalogue from "../../data/menu.json";
import { api, staticPreview } from "./api.mjs";
import { filterItems, formatMoney, localQuote, marketStatus, readPlan, updatePlan } from "./lib.mjs";
import "./styles.css";

const HERO = import.meta.env.BASE_URL + "images/hero.jpg";
const PHONE = "tel:+16106493193";
const categories = [{ id: "all", label: "All favorites" }, { id: "signature", label: "Signature rolls" }, { id: "cooked", label: "Cooked favorites" }, { id: "vegetarian", label: "Vegetarian" }];
const freshRequestKey = () => globalThis.crypto?.randomUUID?.() || "demo-" + Date.now().toString(36) + Math.random().toString(36).slice(2);

function App() {
  const [items, setItems] = useState(catalogue.items);
  const [backend, setBackend] = useState(false);
  const [status, setStatus] = useState(marketStatus());
  const [loading, setLoading] = useState(!staticPreview);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState(() => readPlan(localStorage));
  const [planOpen, setPlanOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [cateringOpen, setCateringOpen] = useState(false);
  const menuHeading = useRef(null);
  useEffect(() => {
    let cancelled = false;
    if (!staticPreview) {
      Promise.all([api("menu"), api("restaurant")])
        .then(([menu, restaurant]) => {
          if (!cancelled) { setItems(menu.items); setStatus(restaurant.status); setBackend(true); }
        }).catch(() => { if (!cancelled) setBackend(false); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    const tick = setInterval(() => setStatus(marketStatus()), 60000);
    return () => { cancelled = true; clearInterval(tick); };
  }, []);
  useEffect(() => { try { localStorage.setItem("sushi-sei-pickup", JSON.stringify(plan)); } catch {} }, [plan]);
  const filtered = useMemo(() => filterItems(items, { query, category }), [items, query, category]);
  const count = Object.values(plan).reduce((total, quantity) => total + quantity, 0);
  function changeItem(item, quantity) {
    try { setPlan(current => updatePlan(current, item.id, quantity)); setAnnouncement(quantity ? item.name + " updated in your pickup plan." : item.name + " removed from your pickup plan."); }
    catch (error) { setAnnouncement(error.message); }
  }
  const closeNav = () => setNavOpen(false);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="Sushi Sei Express home"><span>SUSHI <b>SEI</b></span><small>EXPRESS</small></a>
      <nav className={navOpen ? "primary-nav is-open" : "primary-nav"} id="primary-nav" aria-label="Main navigation">
        <a href="#menu" onClick={closeNav}>Our menu</a><a href="#story" onClick={closeNav}>Our story</a><a href="#catering" onClick={closeNav}>Catering</a><a href="#visit" onClick={closeNav}>Find us <ArrowUpRight size={15} /></a>
      </nav>
      <div className="header-actions">
        <button className="plan-trigger" onClick={() => setPlanOpen(true)} aria-label={"Open pickup plan, " + count + " items"}><ShoppingBag size={18}/><span>Pickup plan</span><span className="plan-count">{count}</span></button>
        <button className="nav-toggle icon-button" aria-label={navOpen ? "Close navigation" : "Open navigation"} aria-expanded={navOpen} aria-controls="primary-nav" onClick={() => setNavOpen(!navOpen)}>{navOpen ? <X/> : <MenuIcon/>}</button>
      </div>
    </header>
    <main id="main">
      <section className="hero section-shell" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title">A little market.<br/><em>A lot of sushi.</em></h1>
          <p>Freshly rolled at Ardmore Farmers Market. A quick lunch, a favorite to take home, or something delicious to share.</p>
          <div className="hero-actions"><a className="button button-dark" href="#menu">Find your favorite <ArrowRight size={18}/></a><a className="text-link" href={PHONE}>Give us a call <ArrowUpRight size={16}/></a></div>
          <div className="market-status"><span className={status.open ? "status-dot is-open" : "status-dot"}/><span>{status.label}</span><span className="status-divider"/><span>Ardmore, Pennsylvania</span></div>
        </div>
        <figure className="hero-visual">
          <div className="hero-image"><img src={HERO} width="1600" height="1067" alt="Illustrative close-up of salmon sushi rolls served on a dark platter" fetchPriority="high"/><span className="photo-stamp">Made fresh.<br/>Every day.</span></div>
          <figcaption><span>Good food. Your neighborhood.</span><span>A market-day favorite. <ArrowDown size={14}/></span></figcaption>
        </figure>
      </section>
      <div className="market-ribbon" aria-label="Restaurant highlights"><span>Rolled fresh daily</span><span className="ribbon-separator"/><span>Cooked & raw favorites</span><span className="ribbon-separator"/><span>Party trays, made to share</span></div>
      <section className="menu-section section-shell" id="menu" aria-labelledby="menu-title">
        <div className="section-heading"><h2 id="menu-title" ref={menuHeading}>Find your<br/><em>next favorite.</em></h2><div className="heading-aside"><p>Start with a classic. Try a little heat.<br/>There’s a roll for your kind of day.</p><a className="text-link" href="http://www.sushiseiexpress.com/menu-1.html" target="_blank" rel="noreferrer">See the restaurant’s full menu <ArrowUpRight size={16}/></a></div></div>
        <div className="menu-controls">
          <div className="category-filters" aria-label="Filter menu">{categories.map(option => <button key={option.id} aria-pressed={category === option.id} className={category === option.id ? "filter-button selected" : "filter-button"} onClick={() => setCategory(option.id)}>{option.label}</button>)}</div>
          <div className="menu-search"><Search size={18} aria-hidden="true"/><label className="visually-hidden" htmlFor="menu-search">Search the menu</label><input id="menu-search" type="search" placeholder="Find your roll" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button className="search-clear" aria-label="Clear menu search" onClick={() => setQuery("")}><X size={16}/></button>}</div>
        </div>
        <div className="quick-finds"><span>A little inspiration:</span><button onClick={() => { setCategory("cooked"); setQuery(""); }}>Keep it cooked <ChevronRight size={14}/></button><button onClick={() => { setCategory("vegetarian"); setQuery(""); }}>Go green <Leaf size={13}/></button><button onClick={() => { setCategory("all"); setQuery("spicy"); }}>Bring the heat <ChevronRight size={14}/></button></div>
        <p className="menu-count" role="status">{loading ? "Loading the menu…" : filtered.length + " favorites to explore"}</p>
        {filtered.length ? <div className="menu-grid">{filtered.map(item => <article className="menu-item" key={item.id}>
          <div className="menu-item-copy"><div className="menu-item-title"><h3>{item.name}</h3><span className="menu-price">{formatMoney(item.price_cents)}</span></div><p>{item.description}</p><div className="menu-item-meta"><span>{item.pieces} pieces</span><span className="meta-divider"/><span>{item.diet === "raw" ? "Contains raw seafood" : item.diet === "vegetarian" ? <><Leaf size={12}/>Vegetarian</> : "Cooked"}</span></div></div>
          <div className="menu-quantity" role="group" aria-label={item.name + " pickup quantity"}>{plan[item.id] > 0 && <button className="add-item" onClick={() => changeItem(item, plan[item.id] - 1)} aria-label={"Decrease " + item.name + " quantity"}><Minus size={19}/></button>}<button className={plan[item.id] ? "add-item has-item" : "add-item"} onClick={() => changeItem(item, Math.min((plan[item.id] || 0) + 1, 20))} disabled={(plan[item.id] || 0) >= 20} aria-label={"Add " + item.name + " to pickup plan"}>{plan[item.id] ? <><Plus size={16}/><span>{plan[item.id]}</span></> : <Plus size={19}/>}</button></div>
        </article>)}</div> : <div className="empty-menu"><Search size={30}/><h3>No rolls found this time.</h3><p>Try another ingredient or explore all our favorites.</p><button className="button button-dark" onClick={() => { setCategory("all"); setQuery(""); }}>Show all favorites <ArrowRight size={16}/></button></div>}
        <p className="menu-note">White-rice prices from the posted menu. Call to confirm current prices and availability. Please ask the team about allergens and shared preparation.</p>
      </section>
      <section className="story-section" id="story" aria-labelledby="story-title"><div className="story-inner section-shell"><div className="story-quote"><span className="quote-mark" aria-hidden="true">“</span><p>All about sushi.<br/><em>All the time.</em></p><span>SUSHI SEI EXPRESS</span></div><div className="story-copy"><h2 id="story-title">A neighborhood stop.<br/>A craft worth sharing.</h2><p>Chef Tu Truong’s story began with a restaurant job in Philadelphia’s Old City, where watching sushi chefs at work sparked a love of the craft.</p><p>At the market in Ardmore, that love comes through in fresh-made rolls, cooked favorites, vegetable combinations, and party trays for your table.</p><a className="text-link light-link" href="http://www.sushiseiexpress.com/about-us.html" target="_blank" rel="noreferrer">Read the chef’s story <ArrowUpRight size={16}/></a></div></div></section>
      <section className="catering-section section-shell" id="catering" aria-labelledby="catering-title"><div className="catering-title"><h2 id="catering-title">Good things<br/><em>come in platters.</em></h2><p>Something for the office. Something for the family. Party trays bring everyone to the table.</p></div><div className="catering-content"><div className="platter-options"><div><span>Vegetable lovers</span><p>A colorful mix of vegetable rolls.</p></div><div><span>Cooked & raw assortment</span><p>A little variety for a hungry crowd.</p></div><div><span>Nigiri & rolls</span><p>A gathering of sushi-bar favorites.</p></div></div><p className="advance-note"><Clock size={17}/>Please arrange party trays at least 24 hours ahead.</p><div className="catering-actions"><a className="button button-rust" href={PHONE}>Let’s plan your platter <Phone size={17}/></a><button className="text-link" onClick={() => setCateringOpen(!cateringOpen)} aria-expanded={cateringOpen} aria-controls="catering-planner">{cateringOpen ? "Close the demo planner" : "Try the catering planner"}<ArrowRight size={16}/></button></div></div>{cateringOpen && <CateringForm backend={backend}/>}</section>
      <section className="visit-section" id="visit" aria-labelledby="visit-title"><div className="visit-inner section-shell"><h2 id="visit-title">Meet you<br/><em>at the market.</em></h2><div className="visit-info"><div className="visit-block"><MapPin size={21}/><div><h3>Ardmore Farmers Market</h3><p>120 Coulter Avenue<br/>Ardmore, PA 19003</p><a className="text-link" href="https://www.google.com/maps/search/?api=1&query=Ardmore+Farmers+Market+120+Coulter+Avenue" target="_blank" rel="noreferrer">Get directions <ArrowUpRight size={15}/></a></div></div><div className="visit-block"><Clock size={21}/><div><h3>A fresh start, every day</h3><dl><div><dt>Monday – Saturday</dt><dd>9 am – 6 pm</dd></div><div><dt>Sunday</dt><dd>9 am – 4 pm</dd></div></dl><p className="hours-note">Hours from the restaurant’s website. Call for holiday changes.</p></div></div><a className="visit-phone" href={PHONE}><Phone size={20}/>610.649.3193<ArrowUpRight size={17}/></a></div></div></section>
    </main>
    <footer className="site-footer section-shell"><a className="wordmark" href="#top"><span>SUSHI <b>SEI</b></span><small>EXPRESS</small></a><p>Fresh from the market.<br/>Made for your day.</p><div className="footer-details"><p>Independent portfolio redesign. Pickup plans and inquiries are demos.</p><a href="http://www.sushiseiexpress.com/home.html" target="_blank" rel="noreferrer">Visit the original restaurant website <ArrowUpRight size={13}/></a><small>Illustrative photography: <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a>. Business details checked October 20, 2026.</small></div></footer>
    <div className="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</div>
    <PickupPlan open={planOpen} close={() => setPlanOpen(false)} items={items} plan={plan} changeItem={changeItem} backend={backend}/>
  </>;
}

function PickupPlan({ open, close, items, plan, changeItem, backend }) {
  const dialog = useRef(null);
  const [quote, setQuote] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const validPlan = useMemo(() => Object.fromEntries(Object.entries(plan).filter(([id]) => items.some(item => item.id === id))), [plan, items]);
  const fallback = useMemo(() => localQuote(items, validPlan), [items, validPlan]);
  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
    if (!open && dialog.current.open) dialog.current.close();
  }, [open]);
  useEffect(() => {
    setQuote(null); setError("");
    if (!open || !backend || !fallback.lines.length) return;
    let cancelled = false;
    setBusy(true);
    api("quote", { method: "POST", body: { lines: fallback.lines.map(line => ({ item_id: line.item_id, quantity: line.quantity })) } })
      .then(result => { if (!cancelled) setQuote(result); })
      .catch(() => { if (!cancelled) setError("The live estimate is unavailable. Showing the posted-menu estimate instead."); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [open, backend, fallback]);
  const result = quote || fallback;
  return <dialog ref={dialog} className="pickup-dialog" aria-labelledby="plan-title" onClose={close} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="pickup-content"><div className="dialog-heading"><div><ShoppingBag size={22}/><h2 id="plan-title">Your pickup plan</h2></div><button className="icon-button" onClick={close} aria-label="Close pickup plan"><X/></button></div><p className="dialog-intro">A little list for your next visit. Call us to confirm your order and pickup time.</p>
      {result.lines.length ? <><ul className="pickup-lines">{result.lines.map(line => { const item = items.find(item => item.id === line.item_id); return <li key={line.item_id}><div className="pickup-line-name"><h3>{line.name}</h3><span>{formatMoney(line.line_total_cents)}</span></div><div className="quantity-control"><button aria-label={"Remove one " + line.name} onClick={() => changeItem(item, line.quantity - 1)}><Minus size={15}/></button><span aria-label={line.name + " quantity"}>{line.quantity}</span><button aria-label={"Add one " + line.name} disabled={line.quantity >= 20} onClick={() => changeItem(item, line.quantity + 1)}><Plus size={15}/></button></div></li>; })}</ul><div className="pickup-summary"><span>Estimated subtotal</span><strong>{formatMoney(result.subtotal_cents)}</strong></div>{busy && <p className="small-status" role="status">Checking the menu estimate…</p>}{error && <p className="form-message" role="status">{error}</p>}<p className="estimate-note">Before tax. Prices and availability are confirmed by the restaurant. This plan does not place an order.</p><a className="button button-rust full-width" href={PHONE}>Call to arrange pickup <Phone size={17}/></a><button className="text-link drawer-continue" onClick={close}>Keep exploring <ArrowRight size={16}/></button></> : <div className="empty-plan"><ShoppingBag size={42}/><h3>Your next favorite is waiting.</h3><p>Add a roll from the menu to start your pickup plan.</p><a className="button button-dark" href="#menu" onClick={close}>Explore the menu <ArrowRight size={16}/></a></div>}
    </div></dialog>;
}
function CateringForm({ backend }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [success, setSuccess] = useState(false);
  const requestKey = useRef(freshRequestKey());
  const today = new Date().toLocaleDateString("en-CA");
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage(""); setSuccess(false);
    const form = event.currentTarget, data = new FormData(form);
    const payload = { name: data.get("name").trim(), email: data.get("email").trim(), guests: Number(data.get("guests")), event_date: data.get("event_date"), notes: data.get("notes").trim() };
    try {
      if (backend) {
        const result = await api("catering", { method: "POST", body: payload, key: requestKey.current });
        setMessage(result.message);
      } else {
        const record = { id: requestKey.current, ...payload, demo: true };
        sessionStorage.setItem("sushi-sei-catering-demo", JSON.stringify(record));
        setMessage("Saved in this browser’s demo only. Call 610.649.3193 to arrange real catering.");
      }
      setSuccess(true); requestKey.current = freshRequestKey(); form.reset();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <div className="catering-planner" id="catering-planner"><div className="planner-intro"><h3>Picture your gathering.</h3><p>Try the planning flow with sample details. This portfolio demo never sends an inquiry to the restaurant.</p></div><form onSubmit={submit} className="catering-form">
    <label>Your name<input name="name" required minLength="2" maxLength="80" autoComplete="off" placeholder="Demo Guest"/></label><label>Email address<input name="email" type="email" required maxLength="160" autoComplete="off" placeholder="demo@example.com"/></label><label>Event date<input name="event_date" type="date" required min={today}/></label><label>Number of guests<input name="guests" type="number" min="2" max="200" required placeholder="12"/></label><label className="form-wide">Anything you have in mind?<textarea name="notes" maxLength="1000" rows="3" placeholder="A mix of cooked and vegetarian favorites…"/></label><div className="form-wide form-bottom"><button className="button button-dark" disabled={busy} type="submit">{busy ? "Saving your demo…" : "Save demo inquiry"}{success ? <Check size={17}/> : <ArrowRight size={17}/>}</button><p role="status" className={success ? "form-message success-message" : "form-message"}>{message}</p></div>
    </form></div>;
}
createRoot(document.getElementById("root")).render(<App/>);
