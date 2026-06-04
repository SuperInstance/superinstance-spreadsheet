"""
Negative Space Intelligence — the core algorithm.

Intelligence = the shape of what's avoided.
-1 = avoidance (negative space, "this hurts")
 0 = unknown (unexplored territory)
+1 = choice (positive space, "this works")

The negative space between avoidances IS the knowledge.
"""
import numpy as np
import json
import time
from collections import Counter

np.random.seed(42)


class NegativeSpaceAgent:
    """Agent that learns through avoidance, not optimization."""
    
    def __init__(self, n_actions=4):
        self.w = np.zeros(n_actions, dtype=np.int8)  # Start: all unknown
        self.n_actions = n_actions
    
    def learn(self, reward_vector, threshold_low=0.3, threshold_high=0.55):
        """
        Core learning: deduction from negative, inference from positive.
        
        reward_vector: reward from each environment for chosen action
        If ANY env gives < threshold_low → AVOID (deduction from negative)
        If ALL envs give > threshold_high → CHOOSE (inference from positive)
        Otherwise → NEUTRAL (insufficient evidence)
        """
        min_r = np.min(reward_vector)
        avg_r = np.mean(reward_vector)
        max_r = np.max(reward_vector)
        
        if min_r < threshold_low:
            return -1  # AVOID — deduction from negative outcome
        elif avg_r > threshold_high and min_r > 0.3:
            return +1  # CHOOSE — inference from consistent positive
        else:
            return 0   # NEUTRAL — insufficient evidence
    
    def act(self):
        """Choose action based on current knowledge."""
        scores = (self.w.astype(float) + 1) / 2 * 0.6 + 0.2
        
        # Prefer known-choices, then unknown, then avoided
        choices = np.where(self.w == +1)[0]
        unknowns = np.where(self.w == 0)[0]
        
        if len(choices) > 0:
            return np.random.choice(choices)  # Pick among known-good
        elif len(unknowns) > 0:
            return np.random.choice(unknowns)  # Explore unknown
        else:
            return int(np.argmax(scores))  # Fallback to best-weighted
    
    def avoidance_profile(self):
        return {
            "avoid": int(np.sum(self.w == -1)),
            "choose": int(np.sum(self.w == +1)),
            "unknown": int(np.sum(self.w == 0)),
            "ratio": float(np.sum(self.w == -1) / max(np.sum(np.abs(self.w)), 1))
        }


class NegativeSpacePopulation:
    """Population learning through collective avoidance."""
    
    def __init__(self, n_agents, n_actions=4):
        self.agents = [NegativeSpaceAgent(n_actions) for _ in range(n_agents)]
        self.n_agents = n_agents
        self.n_actions = n_actions
        self.history = []
    
    def learn_round(self, envs):
        """One round of avoidance learning."""
        reward_matrix = np.array([e.rewards for e in envs])
        
        for agent in self.agents:
            action = agent.act()
            rewards = reward_matrix[:, action]  # Reward from all envs
            decision = agent.learn(rewards)
            agent.w[action] = decision
            
            # Also explore one unknown if available
            unknowns = np.where(agent.w == 0)[0]
            if len(unknowns) > 0 and np.random.random() < 0.4:
                explore = np.random.choice(unknowns)
                exp_rewards = reward_matrix[:, explore]
                exp_decision = agent.learn(exp_rewards)
                agent.w[explore] = exp_decision
    
    def collective_intelligence(self):
        """Aggregate avoidance patterns across the population."""
        all_w = np.array([a.w for a in self.agents])
        avoid = np.mean(all_w == -1, axis=0)
        choose = np.mean(all_w == +1, axis=0)
        unknown = np.mean(all_w == 0, axis=0)
        return {"avoid": avoid.tolist(), "choose": choose.tolist(), "unknown": unknown.tolist()}
    
    def negative_space_shape(self):
        """Topology of the negative space."""
        profile = self.collective_intelligence()
        avoid = np.array(profile["avoid"])
        choose = np.array(profile["choose"])
        
        alignment = 1 - np.std(avoid) / (np.mean(avoid) + 1e-10)
        polarity = float(np.mean(np.abs(avoid - choose)))
        volume = float(np.mean(avoid))
        
        return {"alignment": round(alignment, 3), "polarity": round(polarity, 3), "volume": round(volume, 3)}
    
    def species_detect(self):
        """Cluster agents by avoidance patterns."""
        strats = [tuple(a.w.tolist()) for a in self.agents]
        counts = Counter(strats)
        return len(counts), counts.most_common(10)
    
    def evolve(self, envs, n_rounds=100, selection_pressure=0.3):
        """Learn and evolve through avoidance."""
        for r in range(n_rounds):
            self.learn_round(envs)
            
            # Selection: cull agents with most avoidances (too cautious)
            fitnesses = []
            for agent in self.agents:
                profile = agent.avoidance_profile()
                # Fitness = chosen actions that work well
                chosen = np.where(agent.w == +1)[0]
                if len(chosen) > 0:
                    fit = np.mean([np.mean([e.rewards[a] for e in envs]) for a in chosen])
                else:
                    fit = 0.3  # Low fitness for pure avoiders
                fitnesses.append(fit)
            
            fitnesses = np.array(fitnesses)
            
            if r % 20 == 0:
                n_species, top = self.species_detect()
                shape = self.negative_space_shape()
                profile = self.collective_intelligence()
                avg_avoid = np.mean([a.avoidance_profile()['ratio'] for a in self.agents])
                
                self.history.append({
                    "round": r, "fitness": round(float(np.mean(fitnesses)), 3),
                    "species": n_species, "avoidance_ratio": round(avg_avoid, 3),
                    "shape": shape
                })
                
                print(f"  R{r:>3d}: fit={np.mean(fitnesses):.3f} species={n_species} "
                      f"avoid_ratio={avg_avoid:.2f} alignment={shape['alignment']:.2f}")
            
            # Selection: replace worst performers with mutated copies of best
            ranked = np.argsort(fitnesses)[::-1]
            n_replace = int(self.n_agents * selection_pressure)
            for i in range(n_replace):
                loser_idx = ranked[-(i+1)]
                winner_idx = ranked[i]
                # Mutated copy of winner
                self.agents[loser_idx].w = self.agents[winner_idx].w.copy()
                # Mutate one weight
                mut_idx = np.random.randint(self.n_actions)
                self.agents[loser_idx].w[mut_idx] = np.random.choice([-1, 0, 1])
        
        return self.history


class DecisionLandscape:
    """Create diverse environments with hidden structure."""
    
    @staticmethod
    def create(n_envs=30, n_actions=4):
        env_names = [
            "BullMkt", "BearMkt", "Crypto", "Sideways", "Tech",
            "Negotiate", "Hostile", "Cooperate", "Compete", "Diplomacy",
            "City", "Highway", "Offroad", "Traffic", "Emergency",
            "Eco", "PredPrey", "Symbiosis", "Invade", "Migrate",
            "Resource", "Trade", "Conserve", "Hoard", "Share",
            "Edu", "Health", "Climate", "Energy", "Agri",
        ]
        
        envs = []
        for i in range(n_envs):
            rewards = np.random.uniform(0.1, 0.9, n_actions).astype(np.float32)
            
            # Hidden structure: every 5th env makes action 0 bad
            if i % 5 == 0:
                rewards[0] = 0.05
            
            # Hidden structure: hostile environments (index 6) make aggressive actions bad
            if i == 6 or i == 7:
                rewards[-1] = 0.05  # Last action is bad in hostile
            
            envs.append(Environment(env_names[i % len(env_names)], rewards=rewards))
        
        return envs


class Environment:
    def __init__(self, name, n_actions=4, rewards=None):
        self.name = name
        self.rewards = rewards if rewards is not None else np.random.uniform(0.1, 0.9, n_actions).astype(np.float32)


if __name__ == "__main__":
    print("NEGATIVE SPACE INTELLIGENCE")
    print("Intelligence = the shape of what's avoided")
    print("=" * 60)
    
    envs = DecisionLandscape.create(30)
    pop = NegativeSpacePopulation(1000)
    
    print(f"\n1000 agents × 30 environments × 100 rounds")
    history = pop.evolve(envs, n_rounds=100)
    
    # Final analysis
    profile = pop.collective_intelligence()
    shape = pop.negative_space_shape()
    n_species, top_species = pop.species_detect()
    
    print(f"\nNEGATIVE SPACE MAP:")
    for i in range(4):
        a = profile['avoid'][i]
        c = profile['choose'][i]
        u = profile['unknown'][i]
        bar = "░"*int(a*20) + "·"*int(u*20) + "█"*int(c*20)
        if a > 0.5:
            v = "❌ AVOID"
        elif c > 0.5:
            v = "✅ CHOOSE"
        else:
            v = "⚖️ CONTEXT"
        print(f"  Act{i}: {bar} {a:.0%}/{u:.0%}/{c:.0%} {v}")
    
    print(f"\nTOP SPECIES:")
    for strat, count in top_species[:5]:
        pct = count / 1000 * 100
        avoids = [i for i, w in enumerate(strat) if w == -1]
        chooses = [i for i, w in enumerate(strat) if w == +1]
        print(f"  {strat} → {pct:.1f}% (avoid={avoids} choose={chooses})")
    
    print(f"\nMETRICS:")
    print(f"  Species: {n_species}")
    print(f"  Alignment: {shape['alignment']:.2f}")
    print(f"  Polarity: {shape['polarity']:.2f}")
    print(f"  Avoidance volume: {shape['volume']:.0%}")
    
    # Save
    with open("results/negative-space-deep.json", 'w') as f:
        json.dump({
            "history": history,
            "final_profile": profile,
            "final_shape": shape,
            "species_count": n_species,
            "top_species": [(list(s), c) for s, c in top_species[:10]],
            "thesis": "Intelligence = the shape of what's avoided. Not what's chosen."
        }, f, indent=2)
    print("Saved results/negative-space-deep.json")
