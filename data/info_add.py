import pathlib
p = pathlib.Path('lib/info.ts'); s = p.read_text(encoding='utf-8')
add = pathlib.Path('../data/info_new.ts').read_text(encoding='utf-8')
assert s.rstrip().endswith('};')
i = s.rstrip().rindex('};')
s = s[:i] + add + s[i:]
p.write_text(s, encoding='utf-8', newline='\n')
