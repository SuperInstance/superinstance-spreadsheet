"""
GPU Ternary Batch Engine — the backend that makes the spreadsheet scale to millions.

Intelligence = the shape of what's avoided.
Ternary weights {-1, 0, +1} = {avoid, unknown, choose}
3^4 = 81 possible strategies — enumerable, not searchable.
"""
import numpy as np
import json
import time
from collections import Counter

try:
    import torch
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False


def generate_all_strategies(n_actions=4):
    """Generate all 3^n ternary strategies."""
    strategies = []
    def recurse(depth, current):
        if depth == n_actions:
            strategies.append(current[:])
            return
        for w in [-1, 0, 1]:
            current.append(w)
            recurse(depth + 1, current)
            current.pop()
    recurse(0, [])
    return np.array(strategies, dtype=np.int8)


class TernaryAgent:
    """Single ternary agent with {-1, 0, +1} weights."""
    
    def __init__(self, weights=None, n_actions=4):
        if weights is not None:
            self.w = np.array(weights, dtype=np.int8)
        else:
            self.w = np.random.choice([-1, 0, 1], size=n_actions).astype(np.int8)
    
    def scores(self):
        return (self.w.astype(np.float32) + 1) / 2 * 0.6 + 0.2
    
    def best_action(self):
        s = self.scores()
        return int(np.argmax(s))
    
    def mutate(self, rate=0.1):
        child = self.w.copy()
        for i in range(len(child)):
            if np.random.random() < rate:
                child[i] = np.random.choice([-1, 0, 1])
        return TernaryAgent(child)
    
    def crossover(self, other):
        point = np.random.randint(1, len(self.w))
        child_w = np.concatenate([self.w[:point], other.w[point:]])
        return TernaryAgent(child_w)
    
    def avoidance_ratio(self):
        """Ratio of avoidances to non-neutral weights."""
        neg = np.sum(self.w == -1)
        pos = np.sum(self.w == +1)
        total = neg + pos
        return neg / total if total > 0 else 0
    
    def __repr__(self):
        return f"TernaryAgent({self.w.tolist()})"


class Environment:
    """Decision environment with reward matrix."""
    
    def __init__(self, name, n_actions=4, rewards=None):
        self.name = name
        self.n_actions = n_actions
        if rewards is not None:
            self.rewards = np.array(rewards, dtype=np.float32)
        else:
            self.rewards = np.random.uniform(0.1, 0.9, size=n_actions).astype(np.float32)
    
    def evaluate(self, agent):
        return float(self.rewards[agent.best_action()])
    
    def evaluate_batch(self, actions):
        """Evaluate array of action indices for all agents."""
        return self.rewards[actions]


class Population:
    """Population of ternary agents with evolution."""
    
    def __init__(self, n_agents, n_actions=4):
        self.n_agents = n_agents
        self.n_actions = n_actions
        self.agents = [TernaryAgent(n_actions=n_actions) for _ in range(n_agents)]
        self.history = []
    
    def fitness(self, envs):
        """Compute fitness for each agent across all environments."""
        fitnesses = np.zeros(self.n_agents)
        for i, agent in enumerate(self.agents):
            fitnesses[i] = np.mean([env.evaluate(agent) for env in envs])
        return fitnesses
    
    def fitness_batch(self, envs):
        """Vectorized fitness computation."""
        actions = np.array([a.best_action() for a in self.agents])
        reward_matrix = np.array([env.rewards for env in envs])  # (n_envs, n_actions)
        outcomes = reward_matrix[:, actions]  # (n_envs, n_agents)
        return np.mean(outcomes, axis=0)  # (n_agents,)
    
    def species_count(self):
        strats = [tuple(a.w.tolist()) for a in self.agents]
        return len(Counter(strats))
    
    def entropy(self):
        strats = [tuple(a.w.tolist()) for a in self.agents]
        counts = Counter(strats)
        total = len(strats)
        return -sum((c/total) * np.log2(c/total) for c in counts.values())
    
    def avoidance_ratio(self):
        ratios = [a.avoidance_ratio() for a in self.agents]
        return np.mean(ratios)
    
    def negative_space_profile(self):
        """Aggregate avoidance/choice/neutral across population."""
        all_w = np.array([a.w for a in self.agents])
        avoid = np.mean(all_w == -1, axis=0)
        choose = np.mean(all_w == +1, axis=0)
        neutral = np.mean(all_w == 0, axis=0)
        return {"avoid": avoid.tolist(), "choose": choose.tolist(), "neutral": neutral.tolist()}
    
    def tournament_select(self, fitnesses, k=3):
        """Tournament selection."""
        indices = np.random.choice(self.n_agents, size=k, replace=False)
        winner = indices[np.argmax(fitnesses[indices])]
        return self.agents[winner]
    
    def evolve(self, envs, n_gens=100, elite_frac=0.5, mutation_rate=0.1):
        """Run evolution for n generations."""
        for gen in range(n_gens):
            fitnesses = self.fitness_batch(envs)
            mean_fit = float(np.mean(fitnesses))
            best_fit = float(np.max(fitnesses))
            species = self.species_count()
            ent = self.entropy()
            avoid_r = self.avoidance_ratio()
            
            self.history.append({
                "gen": gen, "mean_fitness": mean_fit, "best_fitness": best_fit,
                "species": species, "entropy": ent, "avoidance_ratio": avoid_r
            })
            
            # Selection
            ranked = np.argsort(fitnesses)[::-1]
            n_elite = int(self.n_agents * elite_frac)
            new_agents = [self.agents[i] for i in ranked[:n_elite]]
            
            # Fill rest with mutated children
            while len(new_agents) < self.n_agents:
                parent = self.tournament_select(fitnesses)
                child = parent.mutate(mutation_rate)
                new_agents.append(child)
            
            self.agents = new_agents
        
        return self.history


class ExhaustiveSearch:
    """Test ALL 81 ternary strategies against all environments."""
    
    def __init__(self, n_actions=4):
        self.strategies = generate_all_strategies(n_actions)
        self.n_strategies = len(self.strategies)
        self.n_actions = n_actions
    
    def evaluate(self, envs):
        """Evaluate all strategies against all environments."""
        # Convert all strategies to scores and best actions
        scores = (self.strategies.astype(np.float32) + 1) / 2 * 0.6 + 0.2
        best_actions = np.argmax(scores, axis=1)
        
        # Build reward matrix
        reward_matrix = np.array([env.rewards for env in envs])  # (n_envs, n_actions)
        
        # Evaluate: reward_matrix[:, best_actions] gives (n_envs, n_strategies)
        outcomes = reward_matrix[:, best_actions]  # (n_envs, n_strategies)
        
        # Aggregate
        results = []
        for i in range(self.n_strategies):
            env_rewards = {envs[e].name: float(outcomes[e, i]) for e in range(len(envs))}
            avg = float(np.mean(outcomes[:, i]))
            results.append({
                "strategy": self.strategies[i].tolist(),
                "best_action": int(best_actions[i]),
                "avg_reward": avg,
                "env_rewards": env_rewards,
            })
        
        results.sort(key=lambda x: -x["avg_reward"])
        return results


class GPUBatch:
    """GPU-accelerated ternary batch for millions of agents."""
    
    def __init__(self, n_agents, n_actions=4, use_gpu=True):
        self.n_agents = n_agents
        self.n_actions = n_actions
        self.use_gpu = use_gpu and HAS_TORCH and torch.cuda.is_available()
        
        # Generate agents as int8 tensor
        agents_np = np.random.choice([-1, 0, 1], size=(n_agents, n_actions)).astype(np.int8)
        if self.use_gpu:
            self.agents = torch.tensor(agents_np, dtype=torch.int8, device='cuda')
        else:
            self.agents = agents_np
    
    def evaluate_batch(self, envs):
        """Evaluate all agents against all environments via matmul."""
        if self.use_gpu:
            scores = (self.agents.float() + 1) / 2 * 0.6 + 0.2
            best_actions = torch.argmax(scores, dim=1)
            
            reward_matrix = torch.tensor(
                np.array([env.rewards for env in envs]),
                dtype=torch.float32, device='cuda'
            )
            outcomes = reward_matrix[:, best_actions]
            return outcomes.cpu().numpy()
        else:
            scores = (self.agents.astype(np.float32) + 1) / 2 * 0.6 + 0.2
            best_actions = np.argmax(scores, axis=1)
            reward_matrix = np.array([env.rewards for env in envs])
            return reward_matrix[:, best_actions]
    
    def evolve_batch(self, envs, n_gens=100, elite_frac=0.5, mutation_rate=0.1):
        """Evolve population for n generations."""
        history = []
        
        for gen in range(n_gens):
            outcomes = self.evaluate_batch(envs)
            fitnesses = np.mean(outcomes, axis=0)
            
            # Selection
            ranked = np.argsort(fitnesses)[::-1]
            n_elite = int(self.n_agents * elite_frac)
            
            # Get elite agents
            if self.use_gpu:
                elite = self.agents[ranked[:n_elite]].cpu().numpy()
            else:
                elite = self.agents[ranked[:n_elite]]
            
            # Create children via mutation
            children = elite.copy()
            mut_mask = np.random.random((len(children), self.n_actions)) < mutation_rate
            new_vals = np.random.choice([-1, 0, 1], size=children.shape)
            children[mut_mask] = new_vals[mut_mask]
            
            # Combine
            new_pop = np.vstack([elite, children])[:self.n_agents].astype(np.int8)
            
            if self.use_gpu:
                self.agents = torch.tensor(new_pop, dtype=torch.int8, device='cuda')
            else:
                self.agents = new_pop
            
            # Metrics
            unique = len(set(tuple(row) for row in new_pop))
            all_flat = new_pop.flatten()
            avoid_pct = float(np.mean(all_flat == -1))
            
            history.append({
                "gen": gen,
                "mean_fitness": float(np.mean(fitnesses)),
                "best_fitness": float(np.max(fitnesses)),
                "species": unique,
                "avoidance_ratio": avoid_pct,
            })
            
            if gen % 50 == 0:
                print(f"  Gen {gen}: fitness={np.mean(fitnesses):.3f} species={unique} avoid={avoid_pct:.0%}")
        
        return history
    
    def to_spreadsheet(self):
        """Export for browser consumption."""
        if self.use_gpu:
            agents_np = self.agents.cpu().numpy()
        else:
            agents_np = self.agents
        
        return {
            "n_agents": self.n_agents,
            "n_actions": self.n_actions,
            "agents": agents_np.tolist(),
        }
    
    @classmethod
    def from_spreadsheet(cls, data, use_gpu=True):
        """Load from browser export."""
        batch = cls(len(data["agents"]), data["n_actions"], use_gpu)
        agents_np = np.array(data["agents"], dtype=np.int8)
        if batch.use_gpu:
            batch.agents = torch.tensor(agents_np, dtype=torch.int8, device='cuda')
        else:
            batch.agents = agents_np
        return batch


if __name__ == "__main__":
    print("GPU TERNARY BATCH ENGINE")
    print("=" * 60)
    
    # Create diverse environments
    env_names = [
        "BullMarket", "BearMarket", "Crypto", "Sideways", "TechBoom",
        "Negotiation", "Hostile", "Cooperation", "Competition", "Diplomacy",
        "CityDrive", "Highway", "OffRoad", "TrafficJam", "Emergency",
        "Ecology", "PredatorPrey", "Symbiosis", "Invasion", "Migration",
        "ResourceAlloc", "Trade", "Conserve", "Hoarding", "Sharing",
        "GameTheory", "PrisonersDilemma", "StagHunt", "Chicken", "TrustGame",
        "Education", "Healthcare", "Climate", "Energy", "Agriculture",
        "SupplyChain", "Logistics", "Inventory", "Demand", "Pricing",
        "Warfare", "Defense", "Intelligence", "Cyber", "Naval",
        "SpaceOrbit", "Launch", "Docking", "EVA", "Comm",
    ]
    
    n_envs = 50
    envs = [Environment(env_names[i % len(env_names)]) for i in range(n_envs)]
    
    # Exhaustive search
    print(f"\nExhaustive search: all 81 strategies × {n_envs} environments")
    ex = ExhaustiveSearch()
    results = ex.evaluate(envs)
    print(f"  Best: {results[0]['strategy']} avg={results[0]['avg_reward']:.3f}")
    print(f"  Worst: {results[-1]['strategy']} avg={results[-1]['avg_reward']:.3f}")
    
    # Population evolution
    print(f"\nPopulation evolution: 10K agents × {n_envs} envs × 200 gens")
    pop = Population(10000, n_actions=4)
    history = pop.evolve(envs, n_gens=200, mutation_rate=0.1)
    
    print(f"\n  Final: fitness={history[-1]['mean_fitness']:.3f} "
          f"species={history[-1]['species']} "
          f"avoidance={history[-1]['avoidance_ratio']:.0%}")
    
    # Profile
    profile = pop.negative_space_profile()
    print(f"\n  Negative space profile:")
    for i in range(4):
        a = profile['avoid'][i]
        c = profile['choose'][i]
        n = profile['neutral'][i]
        bar = "░"*int(a*20) + "·"*int(n*20) + "█"*int(c*20)
        print(f"    Act{i}: {bar} avoid={a:.0%} choose={c:.0%}")
    
    # GPU batch benchmark
    print(f"\nGPU batch benchmark:")
    for n_agents in [1000, 10000, 100000, 1000000]:
        start = time.perf_counter()
        batch = GPUBatch(n_agents, use_gpu=False)  # CPU fallback
        outcomes = batch.evaluate_batch(envs)
        elapsed = time.perf_counter() - start
        throughput = n_agents * n_envs / elapsed
        print(f"  {n_agents:>8,} agents: {elapsed:.3f}s ({throughput/1e6:.0f}M cells/sec)")
    
    # Save results
    output = {
        "exhaustive_top10": results[:10],
        "evolution_history": history[-10:],
        "final_profile": profile,
        "thesis": "Intelligence = the shape of what's avoided",
    }
    
    with open("results/gpu-ternary-factory.json", 'w') as f:
        json.dump(output, f, indent=2)
    print("\nSaved results/gpu-ternary-factory.json")
