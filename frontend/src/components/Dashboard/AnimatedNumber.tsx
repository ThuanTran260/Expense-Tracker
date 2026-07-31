import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  formatter: (n: number) => string;
}

export default function AnimatedNumber({ value, formatter }: AnimatedNumberProps) {
  const spring = useSpring(value, {
    stiffness: 75,
    damping: 18,
    mass: 0.8,
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  const displayValue = useTransform(spring, (latest) => formatter(latest));

  return <motion.span>{displayValue}</motion.span>;
}
