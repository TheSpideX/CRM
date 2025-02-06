import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

export const TestimonialsSection: React.FC = () => {
  const [ref, inView] = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "IT Manager",
      company: "TechCorp Solutions",
      content:
        "The ticket management system has transformed how we handle support requests. The real-time SLA tracking and smart routing have improved our response times by 60%.",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      name: "Michael Chen",
      role: "Support Team Lead",
      company: "CloudServe Inc",
      content:
        "The analytics dashboard provides invaluable insights into our team's performance. We can now make data-driven decisions to optimize our support workflow.",
      image:
        "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      name: "Emma Rodriguez",
      role: "Customer Success Manager",
      company: "Global Systems",
      content:
        "The collaboration features have made it seamless for our distributed team to work together. The real-time updates and team chat are game-changers.",
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80",
    },
  ];

  return (
    <section className="relative py-20">
      <div className="relative z-10 max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            What Our Customers Say
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Trusted by teams worldwide
          </p>
        </motion.div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="relative group"
            >
              {/* Card with glass effect */}
              <div className="h-full rounded-2xl p-8 backdrop-blur-xl bg-background-800/50 border border-white/[0.05] hover:bg-white/[0.08] transition-all duration-300">
                {/* Quote mark decoration */}
                <div className="absolute top-4 right-4 text-6xl text-primary-500/10 font-serif">
                  "
                </div>

                <div className="relative z-10">
                  {/* Content */}
                  <p className="text-white/70 leading-relaxed mb-6">
                    "{testimonial.content}"
                  </p>

                  {/* Author info */}
                  <div className="flex items-center">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-500/20"
                    />
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-white">
                        {testimonial.name}
                      </h3>
                      <p className="text-sm text-white/50">
                        {testimonial.role} · {testimonial.company}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Gradient accent */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
